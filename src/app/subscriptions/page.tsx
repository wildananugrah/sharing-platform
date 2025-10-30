'use client';

import DashboardLayout from "@/components/DashboardLayout";
import { useEffect } from "react";

export default function Notifications() {
    useEffect(() => {
        console.log("Hello notifications!")
    },[])
    return (
        <DashboardLayout>
            <main className="flex-1 overflow-y-auto p-6"></main>
        </DashboardLayout>
    )
}