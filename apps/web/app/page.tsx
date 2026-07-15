"use client";

import dynamic from "next/dynamic";

const ScrollWorld = dynamic(() => import("../components/ScrollWorld"), { ssr: false });

export default function Home() {
  return <ScrollWorld />;
}