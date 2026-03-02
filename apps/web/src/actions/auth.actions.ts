import api from '@/lib/api';

export async function loginAction(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function registerAction(
  name: string,
  email: string,
  password: string,
  workspaceName: string
) {
  const res = await api.post('/auth/register', {
    name,
    email,
    password,
    workspaceName,
  });
  return res.data;
}

export async function getMeAction() {
  const res = await api.get('/auth/me');
  return res.data;
}
