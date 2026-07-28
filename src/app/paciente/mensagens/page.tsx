"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClaraChat } from "@/components/ClaraChat";
import { Loading } from "@/components/brand/ui";

function Chat() {
  const intencao = useSearchParams().get("intencao") ?? undefined;
  return <ClaraChat initialMessage={intencao} />;
}

export default function MensagensPage() {
  return (
    <div className="h-[calc(100vh-88px)]">
      <Suspense fallback={<Loading label="Abrindo conversa…" />}>
        <Chat />
      </Suspense>
    </div>
  );
}
