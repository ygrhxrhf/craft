/** Save a base64 payload (the shape every server export action returns) as a download. */
export function downloadBase64File(filename: string, base64: string, mime: string): void {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
