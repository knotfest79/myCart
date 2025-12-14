
import authSeller from "@/app/middlewares/authSeller";
import imagekit from "@/configs/imagekit";
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const name = formData.get("name");
        const description = formData.get("description");
        const mrp = Number(formData.get("mrp"));
        const price = Number(formData.get("price"));
        const category = formData.get("category");
        const images = formData.getAll("images");

        if (!name || !description || !mrp || !price || !category || images.length < 1) {
            return NextResponse.json({ error: "missing product details" }, { status: 400 });
        }

        // Upload multiple images
        const imageUrls = await Promise.all(
            images.map(async (image) => {
                const buffer = Buffer.from(await image.arrayBuffer());

                const uploaded = await imagekit.files.upload({
                    file: buffer,
                    fileName: image.name,
                    folder: "products",
                });

                // Add transformations manually for v7
                return `${process.env.IMAGEKIT_URL_ENDPOINT}/${uploaded.filePath}?tr=f-webp,q-auto,w-1024`;
            })
        );

        // Save product
        await prisma.product.create({
            data: {
                name,
                description,
                mrp,
                price,
                category,
                images: imageUrls,
                storeId,
            },
        });

        return NextResponse.json({ message: "Product added successfully" });

    } catch (error) {
        console.error("PRODUCT ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
