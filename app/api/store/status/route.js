import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        if (!userId) {
            return NextResponse.json(
                { error: "not authorized" },
                { status: 401 }
            );
        }

        const store = await prisma.store.findUnique({
            where: { userId }
        });

        if (!store) {
            return NextResponse.json({ status: "none" });
        }

        return NextResponse.json({ status: store.status });
    } catch (err) {
        console.log("STATUS ERROR:", err);
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
