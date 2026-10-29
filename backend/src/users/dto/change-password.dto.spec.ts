import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto.js';

async function errorsFor(newPassword: string) {
  const dto = plainToInstance(ChangePasswordDto, { currentPassword: 'old', newPassword });
  return validate(dto);
}

describe('ChangePasswordDto new password', () => {
  it('accepts 8 characters with a letter, a number and a symbol', async () => {
    expect(await errorsFor('Admin@1234')).toHaveLength(0);
    expect(await errorsFor('Abcde@12')).toHaveLength(0);
  });

  it('rejects fewer than 8 characters', async () => {
    expect(await errorsFor('Abc@123')).not.toHaveLength(0);
  });

  it('rejects a password missing a letter, a number or a symbol', async () => {
    expect(await errorsFor('Admin12345')).not.toHaveLength(0);
    expect(await errorsFor('Admin@abcd')).not.toHaveLength(0);
    expect(await errorsFor('1234@5678')).not.toHaveLength(0);
  });

  it('rejects more than 128 characters', async () => {
    expect(await errorsFor(`Aa1@${'x'.repeat(125)}`)).not.toHaveLength(0);
  });
});
