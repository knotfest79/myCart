import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import imagekit from "@/configs/imagekit";
import { toFile } from "@imagekit/nodejs";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        // 1️⃣ Ensure User exists in Prisma
        let existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            // Fetch Clerk user details
            const clerkUser = await fetch(
                `https://api.clerk.com/v1/users/${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
                    }
                }
            ).then(res => res.json());

            existingUser = await prisma.user.create({
                data: {
                    id: userId,
                    name: clerkUser.first_name || "Unknown",
                    email: clerkUser.email_addresses[0].email_address,
                    image: clerkUser.image_url,
                    cart: {}
                }
            });
        }


        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const formData = await request.formData();

        const name = formData.get("name");
        const username = formData.get("username");
        const description = formData.get("description");
        const email = formData.get("email");
        const contact = formData.get("contact");
        const address = formData.get("address");
        const image = formData.get("image");

        if (!name || !username || !description || !email || !contact || !address || !image) {
            return NextResponse.json({ error: "missing store details" }, { status: 400 });
        }

        const exists = await prisma.store.findFirst({
            where: { username: username.toLowerCase() },
        });

        if (exists) {
            return NextResponse.json({ error: "username already taken" }, { status: 400 });
        }

        // Convert the image to buffer → toFile()
        const buffer = Buffer.from(await image.arrayBuffer());
        const fileToUpload = await toFile(buffer, image.name);

        // Upload to ImageKit (v7)
        const uploaded = await imagekit.files.upload({
            file: fileToUpload,
            fileName: image.name,
        });
        const imageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/${uploaded.filePath}`;
        // Save store
        await prisma.store.create({
            data: {
                userId,
                name,
                username: username.toLowerCase(),
                description,
                email,
                contact,
                address,
                logo: imageUrl,
                status: "pending",
            },
        });

        return NextResponse.json({ message: "Store submitted successfully" });

    } catch (error) {
        console.error("STORE ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
