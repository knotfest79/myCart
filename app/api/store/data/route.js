import prisma from "@/lib/prisma";

import { NextResponse } from "next/server";
//Get Store info & store products

export async function get(request) {
    try {

        // get store username from query params
        const { searchParams } = new URL(request.url)
        const username = searchParams.get('username').toLowerCase();

        if (!username) {
            return NextResponse.json({ message: "missing username" }, { status: 400 })
        }

        //Get store info and inStock prodcuts wit ratings

        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: { Product: { rating: true } }
        })

        if (!store) {
            return NextResponse.json({ message: "store not found" }, { status: 400 })
        }

        return NextResponse.json({ store })
    } catch (error) {

        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })

    }

}