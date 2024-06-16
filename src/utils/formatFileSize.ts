export default function formatFileSize(bytes: number): string {
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let unitIndex = 0;

  while (bytes >= 1024 && unitIndex < units.length - 1) {
    bytes /= 1024;
    unitIndex++;
  }

  return `${bytes.toFixed(2)} ${units[unitIndex]}`;
}
