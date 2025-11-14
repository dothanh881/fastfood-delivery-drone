import api from './api';

export async function uploadImage(file: File, folder = 'menu-items'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const url = folder ? `/files/upload/${encodeURIComponent(folder)}` : '/files/upload';
  const res = await api.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const path: string = res.data?.path || '';
  return path;
}