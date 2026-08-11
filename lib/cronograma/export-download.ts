// ============================================================
// Téléchargement des exports du cronograma — SVG (vectoriel), PNG et PDF.
// Tout est dérivé du SVG produit par `renderCronogramaSVG`, CÔTÉ CLIENT, sans
// dépendance externe (contrainte free-tier : pas de Chromium serverless) :
//   • PNG : le SVG est dessiné dans un <canvas> à une échelle donnée (net) ;
//   • PDF : une page unique à la taille du dessin, contenant l'image en
//     /FlateDecode (RGB brut dégonflé via CompressionStream) → SANS PERTE,
//     texte parfaitement lisible pour une pièce jointe de rapport.
// ============================================================

// Dimensions logiques déclarées par le SVG (attributs width/height).
function dimsSVG(svg: string): { w: number; h: number } {
  const w = Number(/\bwidth="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 800);
  const h = Number(/\bheight="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 600);
  return { w, h };
}

function descargarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarSVG(svg: string, filename: string): void {
  descargarBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
}

// SVG → <canvas> rasterisé à `escala` (fond blanc, pas de transparence).
async function svgACanvas(svg: string, escala: number): Promise<HTMLCanvasElement> {
  const { w, h } = dimsSVG(svg);
  const img = new Image();
  const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar el SVG"));
    img.src = svg64;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * escala);
  canvas.height = Math.round(h * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function svgAPngBlob(svg: string, escala = 2): Promise<Blob> {
  const canvas = await svgACanvas(svg, escala);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falló"))), "image/png"),
  );
}

export async function descargarPNG(svg: string, filename: string, escala = 2): Promise<void> {
  descargarBlob(await svgAPngBlob(svg, escala), filename);
}

// Dégonfle des octets (zlib/deflate) via l'API native du navigateur.
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  // Cast : selon la version de lib.dom, `write` attend un BufferSource dont le
  // buffer est un ArrayBuffer (pas ArrayBufferLike) — l'Uint8Array convient.
  writer.write(bytes as unknown as BufferSource);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

// PDF minimal : une page à la taille (en points = px logiques) du dessin, avec
// l'image RGB en /FlateDecode (sans perte). xref calculé à l'octet près.
export async function descargarPDF(svg: string, filename: string, escala = 2): Promise<void> {
  const { w, h } = dimsSVG(svg);
  const canvas = await svgACanvas(svg, escala);
  const ctx = canvas.getContext("2d")!;
  const { data, width: iw, height: ih } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // RGBA → RGB sur fond blanc (l'alpha est déjà opaque, mais on sécurise).
  const rgb = new Uint8Array(iw * ih * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i];
    rgb[j + 1] = data[i + 1];
    rgb[j + 2] = data[i + 2];
  }
  const comprimido = await deflate(rgb);

  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (u: Uint8Array | string) => {
    const b = typeof u === "string" ? enc.encode(u) : u;
    partes.push(b);
    pos += b.length;
  };
  const obj = (n: number, cuerpo: string) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n${cuerpo}\nendobj\n`);
  };

  push("%PDF-1.4\n%\xff\xff\xff\xff\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  );
  // Objet 4 : image (stream binaire).
  offsets[4] = pos;
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${comprimido.length} >>\nstream\n`,
  );
  push(comprimido);
  push("\nendstream\nendobj\n");
  // Objet 5 : contenu (place l'image plein cadre).
  const contenido = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;
  obj(5, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);

  const xrefPos = pos;
  const n = 6;
  let xref = `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (let i = 1; i < n; i += 1) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  push(xref);
  push(`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const total = partes.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of partes) {
    out.set(b, o);
    o += b.length;
  }
  descargarBlob(new Blob([out], { type: "application/pdf" }), filename);
}
