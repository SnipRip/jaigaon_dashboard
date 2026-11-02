"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { COMPANY_TAX_PROFILE } from "@/features/gst/company-tax-profile";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import { PARTIES_LIST_PATH, saveParty, setPartyArchived, toParty } from "./parties-api";
import { PartiesWorkspace } from "./parties-workspace";
import { PartyForm } from "./party-form";
import { ROLE_TEXT } from "./party-rules";
import type { PartyRole } from "./types";

// The Customers and Vendors screens, loading parties from the backend. Both
// lists read the same route, so a party saved on one shows on the other.
function useParties() {
  const { data, error, mutate } = useSWR<PartyView[]>(PARTIES_LIST_PATH, apiGet);
  const parties = useMemo(() => data?.map(toParty), [data]);
  const reload = async () => {
    await mutate();
  };
  return { parties, error, reload };
}

export function PartiesScreen({ role }: { role: PartyRole }) {
  const { parties, error } = useParties();
  if (!parties) return <LoadNotice error={error} what={ROLE_TEXT[role].many} />;
  return <PartiesWorkspace role={role} parties={parties} companyState={COMPANY_TAX_PROFILE.stateCode} />;
}

/** A new party when `partyId` is absent. */
export function PartyScreen({ role, partyId }: { role: PartyRole; partyId?: string }) {
  const router = useRouter();
  const { parties, error, reload } = useParties();
  const text = ROLE_TEXT[role];
  if (!parties) return <LoadNotice error={error} what={`the ${text.one}`} />;

  const party = partyId ? parties.find((candidate) => candidate.id === partyId) : undefined;
  if (partyId && !party) return <LoadNotice error={new Error(`This ${text.one} does not exist.`)} what={`the ${text.one}`} />;
  // Opened from the other list (a vendor under /customers): send it where it belongs.
  if (party && !party.roles.includes(role)) {
    const other = ROLE_TEXT[party.roles[0]];
    return <LoadNotice error={new Error(`${party.displayName} is not a ${text.one}. Open it from ${other.many}.`)} what={`the ${text.one}`} />;
  }

  return (
    <PartyForm
      key={party?.id ?? "new"}
      role={role}
      party={party}
      companyState={COMPANY_TAX_PROFILE.stateCode}
      onSave={async (values) => {
        const saved = await saveParty(party, values);
        await reload();
        if (!party) router.push(`${text.path}/${saved.id}`);
      }}
      onArchive={
        party
          ? async (archived) => {
              await setPartyArchived(party, archived);
              await reload();
            }
          : undefined
      }
    />
  );
}
