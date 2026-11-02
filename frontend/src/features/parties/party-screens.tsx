"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { LoadNotice } from "@/components/ui/load-notice";
import { useCompanyProfile } from "@/features/company/use-company-profile";
import { withArchived } from "@/features/masters/masters-api";
import { PRICE_LEVELS_PATH } from "@/features/rates/rates-api";
import { apiGet } from "@/lib/api-client";
import type { PartyView } from "@/types/party";
import type { PriceLevelView } from "@/types/pricing";
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
  const { profile, error: profileError } = useCompanyProfile();
  if (!parties || !profile) return <LoadNotice error={error ?? profileError} what={ROLE_TEXT[role].many} />;
  return <PartiesWorkspace role={role} parties={parties} companyState={profile.stateCode} />;
}

/** A new party when `partyId` is absent. */
export function PartyScreen({ role, partyId }: { role: PartyRole; partyId?: string }) {
  const router = useRouter();
  const { parties, error, reload } = useParties();
  // Archived levels too, so a customer still on one keeps it in the picker.
  const { data: levels, error: levelsError } = useSWR<PriceLevelView[]>(withArchived(PRICE_LEVELS_PATH), apiGet);
  const { profile, error: profileError } = useCompanyProfile();
  const text = ROLE_TEXT[role];
  if (!parties || !levels || !profile) return <LoadNotice error={error ?? levelsError ?? profileError} what={`the ${text.one}`} />;

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
      priceLevels={levels
        .filter((level) => !level.isArchived || level.id === party?.priceLevelId)
        .map((level) => ({ id: level.id, name: level.isArchived ? `${level.name} (archived)` : level.name }))}
      companyState={profile.stateCode}
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
