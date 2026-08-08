import { NextRequest, NextResponse } from "next/server";

const AEP_LABELS = ["63.2%", "50%", "20%", "10%", "5%", "2%", "1%"];

const textContent = (html: string) => html
  .replace(/<abbr[^>]*>(.*?)<\/abbr>/gi, "$1")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

function parseIfd(html: string) {
  const table = html.match(/<table id="intensities"[\s\S]*?<\/table>/i)?.[0];
  if (!table) throw new Error("BoM returned a response without an intensity table.");

  const durations = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap((rowMatch) => {
    const row = rowMatch[1];
    const durationMatch = row.match(/<th[^>]*id="ifdDur(\d+)"[^>]*>([\s\S]*?)<\/th>/i);
    if (!durationMatch) return [];
    const values = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => Number(textContent(match[1])))
      .slice(0, AEP_LABELS.length);
    if (values.length !== AEP_LABELS.length || values.some((value) => !Number.isFinite(value))) return [];
    return [{
      minutes: Number(durationMatch[1]),
      label: textContent(durationMatch[2]),
      intensities: Object.fromEntries(AEP_LABELS.map((aep, index) => [aep, values[index]])),
    }];
  });

  const latitudeText = textContent(html.match(/<span id="ifdReturnedLatitude">([\s\S]*?)<\/span>/i)?.[1] ?? "");
  const longitudeText = textContent(html.match(/<span id="ifdReturnedLongitude">([\s\S]*?)<\/span>/i)?.[1] ?? "");
  const issued = textContent(html.match(/<p class="ifdIssuedOn">([\s\S]*?)<\/p>/i)?.[1] ?? "").replace(/^Issued:\s*/i, "");
  const latMagnitude = Number(latitudeText.match(/[\d.]+/)?.[0]);
  const lonMagnitude = Number(longitudeText.match(/[\d.]+/)?.[0]);
  if (!durations.length || !Number.isFinite(latMagnitude) || !Number.isFinite(lonMagnitude)) {
    throw new Error("The BoM IFD response could not be parsed.");
  }

  return {
    durations,
    gridLatitude: /\bS\b/i.test(latitudeText) ? -latMagnitude : latMagnitude,
    gridLongitude: /\bW\b/i.test(longitudeText) ? -lonMagnitude : lonMagnitude,
    issued,
  };
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";
  if (address.length < 4 || address.length > 250) {
    return NextResponse.json({ error: "Enter a valid Australian address." }, { status: 400 });
  }

  try {
    const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
    geocodeUrl.searchParams.set("q", address);
    geocodeUrl.searchParams.set("format", "jsonv2");
    geocodeUrl.searchParams.set("countrycodes", "au");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("addressdetails", "1");
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-AU,en;q=0.9",
        "User-Agent": "FloodRiskAdvisory-EngineeringTools/1.0 (https://floodriskadvisory.com.au)",
      },
      cache: "no-store",
    });
    if (!geocodeResponse.ok) throw new Error("Address lookup is temporarily unavailable.");
    const matches = await geocodeResponse.json() as Array<{ lat: string; lon: string; display_name: string }>;
    const match = matches[0];
    if (!match) return NextResponse.json({ error: "No Australian address match was found. Try adding the suburb and state." }, { status: 404 });

    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("The address coordinates were invalid.");

    const bomUrl = new URL("https://www.bom.gov.au/water/designRainfalls/revised-ifd/");
    bomUrl.searchParams.set("coordinate_type", "dd");
    bomUrl.searchParams.set("design", "ifds");
    bomUrl.searchParams.set("latitude", String(latitude));
    bomUrl.searchParams.set("longitude", String(longitude));
    bomUrl.searchParams.set("sdmin", "true");
    bomUrl.searchParams.set("sdhr", "true");
    bomUrl.searchParams.set("sdday", "true");
    bomUrl.searchParams.set("values", "intensities");
    bomUrl.searchParams.set("year", "2016");
    bomUrl.searchParams.set("user_label", match.display_name.slice(0, 80));

    const bomResponse = await fetch(bomUrl, {
      headers: { "User-Agent": "FloodRiskAdvisory-EngineeringTools/1.0" },
      cache: "no-store",
    });
    if (!bomResponse.ok) throw new Error("BoM IFD data is temporarily unavailable.");
    const parsed = parseIfd(await bomResponse.text());

    return NextResponse.json({
      address: match.display_name,
      latitude,
      longitude,
      gridLatitude: parsed.gridLatitude,
      gridLongitude: parsed.gridLongitude,
      issued: parsed.issued,
      sourceUrl: bomUrl.toString(),
      aeps: AEP_LABELS,
      durations: parsed.durations,
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "The address and IFD data could not be retrieved.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
