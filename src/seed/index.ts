import { auth, closeAuthClient } from "../lib/auth";
import { connectDatabase, disconnectDatabase } from "../lib/db";
import { env } from "../config/env";
import { Booking } from "../models/Booking";
import { Payment } from "../models/Payment";
import { Service } from "../models/Service";
import { User } from "../models/User";

const technicianSeeds = [
  {
    name: "Rahim Uddin",
    email: "technician@fixmate.test",
    password: "FixMate123!",
    phone: "+8801711000001",
    area: "Dhanmondi, Dhaka",
    bio: "12 years repairing smartphones and laptops. Apple-certified technician.",
  },
  {
    name: "Karim Ahmed",
    email: "tech2@fixmate.test",
    password: "FixMate123!",
    phone: "+8801711000002",
    area: "Mirpur, Dhaka",
    bio: "AC, refrigerator and washing machine specialist. Same-day home visits.",
  },
];

const customerSeeds = [
  {
    name: "Demo Customer",
    email: "customer@fixmate.test",
    password: "FixMate123!",
    phone: "+8801811000003",
    area: "Gulshan, Dhaka",
    bio: "",
  },
];

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const serviceSeeds = [
  ["iPhone Screen Replacement", "Smartphone", 45, "2-3 hours", "Shop Drop-off", "Dhanmondi, Dhaka", "photo-1511707171634-5f897ff02aa9", 0],
  ["Samsung Galaxy Battery Swap", "Smartphone", 28, "1 hour", "Shop Drop-off", "Dhanmondi, Dhaka", "photo-1610945415295-d9bbf067e59c", 0],
  ["Water-damaged Phone Recovery", "Smartphone", 65, "1 day", "Shop Drop-off", "Dhanmondi, Dhaka", "photo-1592750475338-74b7b21085ab", 0],
  ["Laptop Motherboard Diagnostics", "Laptop & PC", 55, "1 day", "Shop Drop-off", "Dhanmondi, Dhaka", "photo-1517336714731-489689fd1ca8", 0],
  ["Laptop Deep Cleaning & Thermal Paste", "Laptop & PC", 32, "3 hours", "Home Visit", "Dhanmondi, Dhaka", "photo-1496181133206-80ce9b88a853", 0],
  ["AC Gas Refill & Servicing", "AC", 48, "2 hours", "Home Visit", "Mirpur, Dhaka", "photo-1631545806609-a7bfaa0a59f3", 1],
  ["AC Compressor Replacement", "AC", 120, "1 day", "Home Visit", "Mirpur, Dhaka", "photo-1628744876497-ad6b6cef3cd8", 1],
  ["Refrigerator Cooling Repair", "Refrigerator", 70, "4 hours", "Home Visit", "Mirpur, Dhaka", "photo-1571175443880-49e1d25b2bc5", 1],
  ["Refrigerator Compressor Check", "Refrigerator", 60, "3 hours", "Home Visit", "Mirpur, Dhaka", "photo-1585659722983-3a675dabf23d", 1],
  ["Smart TV Screen Repair", "TV", 95, "1 day", "Home Visit", "Mirpur, Dhaka", "photo-1593359677879-a4bb92f829d1", 1],
  ["Washing Machine Motor Repair", "Washing Machine", 52, "4 hours", "Home Visit", "Mirpur, Dhaka", "photo-1626806787461-102c1bfaaea1", 1],
  ["Home Electrical Wiring Inspection", "Electrical", 40, "2 hours", "Home Visit", "Mirpur, Dhaka", "photo-1621905251189-08b45d6a269e", 1],
] as const;

const ensureUser = async (data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  area: string;
  bio: string;
}) => {
  if (!(await User.findOne({ email: data.email }))) {
    await auth.api.signUpEmail({
      body: { name: data.name, email: data.email, password: data.password },
    });
  }
  // BetterAuth writes ObjectId _ids into `users`; Mongoose casts them to strings.
  // Update by email so we never try to save a string id back as an ObjectId filter.
  await User.updateOne(
    { email: data.email },
    { $set: { phone: data.phone, area: data.area, bio: data.bio } },
  );
  const user = await User.findOne({ email: data.email });
  if (!user) throw new Error(`Could not create ${data.email}`);
  return user;
};

const run = async () => {
  await connectDatabase();

  const adminEmail = env.adminEmail.toLowerCase();
  if (!(await User.findOne({ email: adminEmail }))) {
    await auth.api.signUpEmail({
      body: {
        name: "FixMate Admin",
        email: adminEmail,
        password: env.adminPassword,
      },
    });
  }
  await User.updateOne({ email: adminEmail }, { $set: { role: "admin" } });

  const technicians = [];
  for (const technician of technicianSeeds) {
    await ensureUser(technician);
    await User.updateOne({ email: technician.email }, { $set: { role: "technician" } });
    const technicianUser = await User.findOne({ email: technician.email });
    if (!technicianUser) throw new Error(`Could not update ${technician.email}`);
    technicians.push(technicianUser);
  }
  const customer = await ensureUser(customerSeeds[0]);

  if ((await Service.countDocuments()) === 0) {
    for (const seed of serviceSeeds) {
      const [title, category, basePrice, estimatedDuration, serviceMode, serviceArea, photo, techIndex] = seed;
      const technician = technicians[techIndex];
      await Service.create({
        title,
        category,
        description: `${title} by a verified FixMate technician. Includes a full diagnostic, genuine parts where needed, and a service warranty.`,
        image: image(photo),
        basePrice,
        estimatedDuration,
        serviceMode,
        serviceArea,
        technicianName: technician.name,
        technicianEmail: technician.email,
        approvalStatus: "approved",
        isAvailable: true,
      });
    }
  }

  if ((await Booking.countDocuments()) === 0) {
    const services = await Service.find().sort({ createdAt: 1 }).lean();
    const statuses = ["requested", "accepted", "in-progress", "completed", "cancelled"] as const;
    for (const [index, status] of statuses.entries()) {
      const service = services[index];
      const booking = await Booking.create({
        serviceId: service._id,
        serviceTitle: service.title,
        serviceImage: service.image,
        category: service.category,
        basePrice: service.basePrice,
        technicianName: service.technicianName,
        technicianEmail: service.technicianEmail,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: "House 12, Road 7, Gulshan, Dhaka",
        preferredDate: new Date(Date.now() + (index + 2) * 86_400_000),
        problemDescription: "The device stopped working after a power surge and needs a full diagnostic.",
        status,
        finalAmount: service.basePrice,
        paymentStatus: status === "completed" ? "unpaid" : "unpaid",
        statusHistory: [{ status, changedAt: new Date() }],
      });
      if (status === "completed") {
        await Payment.create({
          bookingId: booking._id,
          serviceTitle: booking.serviceTitle,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          technicianName: booking.technicianName,
          technicianEmail: booking.technicianEmail,
          amount: booking.finalAmount,
          currency: "usd",
          transactionId: `seed_pi_${index}`,
          stripeSessionId: `seed_cs_${index}`,
          paymentStatus: "paid",
          paidAt: new Date(),
        });
        booking.paymentStatus = "paid";
        await booking.save();
      }
    }
  }

  console.log("[fixmate] seed complete");
  console.log(`admin: ${adminEmail} / ${env.adminPassword}`);
  console.log("technician: technician@fixmate.test / FixMate123!");
  console.log("customer: customer@fixmate.test / FixMate123!");
  await disconnectDatabase();
  await closeAuthClient();
};

run().catch(async (error) => {
  console.error("[fixmate] seed failed:", error);
  await disconnectDatabase();
  await closeAuthClient();
  process.exit(1);
});
