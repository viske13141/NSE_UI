import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { apiRoleMap, REFRESH_KEY, TOKEN_KEY } from '@/constants/auth.constants';
import { setUser, logout } from '@/redux/slices/authSlice';
import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types/auth.types';
import { parseAuthError } from '@/types/auth.types';

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_BASE_URL ?? '/auth-api';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: AUTH_BASE_URL,
    prepareHeaders: (headers) => {
      headers.set('accept', 'application/json');
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      transformErrorResponse: (response) => {
        // fetchBaseQuery wraps network failures as { status: 'FETCH_ERROR', error: string }
        if ((response as any).status === 'FETCH_ERROR') {
          return { message: 'Unable to reach the server. Check your connection and try again.' };
        }
        return parseAuthError(response);
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
        const internalRole = apiRoleMap[data.role] ?? 'customer';
        dispatch(
          setUser({
            id: data.email,
            name: data.full_name,
            email: data.email,
            role: internalRole,
            isVerified: true,
          })
        );
      },
    }),
    refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: '/refresh-token',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled;
        localStorage.setItem(TOKEN_KEY, data.access_token);
      },
    }),
    changePassword: builder.mutation<ChangePasswordResponse, ChangePasswordRequest & { token: string }>({
      query: ({ token, ...body }) => ({
        url: '/change-password',
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      transformErrorResponse: (response) =>
        parseAuthError(response, 'Failed to change password.'),
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useChangePasswordMutation,
} = authApi;

export const refreshAccessToken = async (
  dispatch: (action: ReturnType<typeof logout>) => void
): Promise<boolean> => {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${AUTH_BASE_URL}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return true;
  } catch {
    dispatch(logout());
    window.location.href = '/login?role=admin&reason=timeout';
    return false;
  }
};
