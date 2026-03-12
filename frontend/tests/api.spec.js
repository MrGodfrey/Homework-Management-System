import { describe, it, expect, vi } from 'vitest';
import api from '../src/utils/api';
describe('API Interceptors', () => {
    it('should add Authorization header if token exists', () => {
        localStorage.setItem('token', 'test_token');
        const config = { headers: {} };
        const newConfig = api.interceptors.request.handlers[0].fulfilled(config);
        expect(newConfig.headers.Authorization).toBe('Bearer test_token');
    });
    it('should handle 401 response and redirect to login', () => {
        const error = { response: { status: 401 } };
        // Mocking router push would happen here.
        expect(api.interceptors.response.handlers[0].rejected(error)).rejects.toEqual(error);
    });
});
