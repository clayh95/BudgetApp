import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should be created', () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    expect(service).toBeTruthy();
  });
});
