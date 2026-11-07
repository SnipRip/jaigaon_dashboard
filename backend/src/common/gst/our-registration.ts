// Our own GST registration, as every tax decision needs it: the state we are
// registered in and how. A regular taxpayer charges GST and claims input
// credit. A composition dealer (s.10 CGST Act) and an unregistered business
// issue a bill of supply with no GST, claim no input credit and may supply
// goods only inside their own state (s.10(2)(d), s.24(i)).
import type { GstRegistration } from '../../generated/prisma/enums.js';

export interface OurRegistration {
  stateCode: string;
  registration: GstRegistration;
}

/** Whether we charge GST on sales and claim it back on purchases. */
export const chargesGst = (company: OurRegistration) => company.registration === 'REGULAR';

/** Why a sale outside our state is refused, for a business that may not make one. */
export function outsideStateProblem(company: OurRegistration): string {
  return company.registration === 'COMPOSITION'
    ? 'A composition dealer can sell only inside its own state: no exports, SEZ or other-state sales'
    : 'An unregistered business can sell only inside its own state: register for GST to export or sell to other states';
}
