declare module 'file-saver' {
  export default function saveAs(data: Blob | string, filename?: string, options?: any): void;
}  