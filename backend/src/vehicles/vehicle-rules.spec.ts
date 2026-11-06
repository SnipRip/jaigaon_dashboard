import { describe, expect, it } from 'vitest';
import { settleVehicle, vehicleProblem } from './vehicle-rules.js';

describe('vehicle rules', () => {
  it('drops the transporter from our own vehicle', () => {
    expect(settleVehicle({ ownership: 'OWN', transporterId: 'abc' })).toEqual({ ownership: 'OWN', transporterId: null });
    expect(settleVehicle({ ownership: 'HIRED', transporterId: 'abc' })).toEqual({ ownership: 'HIRED', transporterId: 'abc' });
  });

  it('refuses a transporter on our own vehicle; a hired one may have none yet', () => {
    expect(vehicleProblem({ ownership: 'OWN', transporterId: 'abc' })).toMatch(/own vehicle/);
    expect(vehicleProblem({ ownership: 'HIRED', transporterId: null })).toBeNull();
    expect(vehicleProblem({ ownership: 'OWN', transporterId: null })).toBeNull();
  });
});
