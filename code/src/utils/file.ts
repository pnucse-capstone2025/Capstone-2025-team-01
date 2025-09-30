export function getExtensionFromUriOrFilename(uri: string, fileName?: string, mimeType?: string) {
  const name = fileName ?? uri.split(/[/\\]/).pop() ?? '';
  const byName = name.includes('.') ? name.split('.').pop() : undefined;
  if (byName) return byName.toLowerCase();
  if (mimeType?.startsWith('image/')) {
    const ext = mimeType.split('/')[1];
    if (ext) return ext.toLowerCase();
  }
  return 'jpg';
}
