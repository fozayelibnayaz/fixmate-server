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
    role: "technician" as const,
    phone: "+8801711000001",
    area: "Dhanmondi, Dhaka",
    bio: "12 years repairing smartphones and laptops. Apple-certified technician.",
  },
  {
    name: "Karim Ahmed",
    email: "tech2@fixmate.test",
    password: "FixMate123!",
    role: "technician" as const,
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
    role: "customer" as const,
    phone: "+8801811000003",
    area: "Gulshan, Dhaka",
    bio: "",
  },
];

const serviceSeeds = [
  {
    title: "iPhone Screen Replacement",
    category: "Smartphone",
    basePrice: 10500,
    estimatedDuration: "2-3 hours",
    serviceMode: "Shop Drop-off",
    serviceArea: "Dhanmondi, Dhaka",
    image: "/services/smartphone.svg",
    technicianIndex: 0,
    description: "Cracked, flickering or unresponsive screen? We fit a quality display, test touch and brightness, and check the cameras before handing your phone back.",
  },
  {
    title: "Samsung Galaxy Battery Swap",
    category: "Smartphone",
    basePrice: 2200,
    estimatedDuration: "1 hour",
    serviceMode: "Shop Drop-off",
    serviceArea: "Dhanmondi, Dhaka",
    image: "/services/smartphone.svg",
    technicianIndex: 0,
    description: "If your battery drains quickly or the phone shuts down suddenly, we replace it with a reliable cell and check charging and heat with it fitted.",
  },
  {
    title: "Water-damaged Phone Recovery",
    category: "Smartphone",
    basePrice: 3000,
    estimatedDuration: "1 day",
    serviceMode: "Shop Drop-off",
    serviceArea: "Dhanmondi, Dhaka",
    image: "/services/smartphone.svg",
    technicianIndex: 0,
    description: "We clean and inspect a wet phone, check the board for corrosion and try to recover your photos and contacts. Parts needed for a full repair are quoted separately.",
  },
  {
    title: "Laptop Motherboard Diagnostics",
    category: "Laptop & PC",
    basePrice: 1800,
    estimatedDuration: "1 day",
    serviceMode: "Shop Drop-off",
    serviceArea: "Dhanmondi, Dhaka",
    image: "/services/laptop.svg",
    technicianIndex: 0,
    description: "No power, no display or random shutdowns? We test the board, power circuit and connections, then explain exactly what needs fixing before any work starts.",
  },
  {
    title: "Laptop Deep Cleaning & Thermal Paste",
    category: "Laptop & PC",
    basePrice: 2000,
    estimatedDuration: "3 hours",
    serviceMode: "Home Visit",
    serviceArea: "Dhanmondi, Dhaka",
    image: "/services/laptop.svg",
    technicianIndex: 0,
    description: "We remove dust from the fans and vents, replace old thermal paste and check temperatures so your laptop runs quieter and stays cool under load.",
  },
  {
    title: "AC Gas Refill & Servicing",
    category: "AC",
    basePrice: 3000,
    estimatedDuration: "2 hours",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/ac.svg",
    technicianIndex: 1,
    description: "Weak cooling? We inspect for leaks, clean the indoor and outdoor units, then top up the correct gas if it is actually needed. No gas is added without a pressure check.",
  },
  {
    title: "AC Compressor Replacement",
    category: "AC",
    basePrice: 22000,
    estimatedDuration: "1 day",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/ac.svg",
    technicianIndex: 1,
    description: "For a compressor that has failed, we supply and fit a compatible unit, vacuum the lines, recharge the gas and test cooling. A confirmed quote is shared before fitting.",
  },
  {
    title: "Refrigerator Cooling Repair",
    category: "Refrigerator",
    basePrice: 3500,
    estimatedDuration: "4 hours",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/refrigerator.svg",
    technicianIndex: 1,
    description: "Not cooling, over-freezing or making strange noises? We check the thermostat, fan, relay and gas pressure, then repair the fault and test the temperature.",
  },
  {
    title: "Refrigerator Compressor Check",
    category: "Refrigerator",
    basePrice: 2200,
    estimatedDuration: "3 hours",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/refrigerator.svg",
    technicianIndex: 1,
    description: "We test the compressor, start relay and electrical supply to find out whether your fridge needs a simple repair or a replacement part. Replacement cost is quoted first.",
  },
  {
    title: "Smart TV Screen Repair",
    category: "TV",
    basePrice: 7000,
    estimatedDuration: "1 day",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/tv.svg",
    technicianIndex: 1,
    description: "Cracked panel, black lines, no picture or backlight trouble? We inspect the screen and backlight, then replace the damaged part and test picture and sound.",
  },
  {
    title: "Washing Machine Motor Repair",
    category: "Washing Machine",
    basePrice: 4500,
    estimatedDuration: "4 hours",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/washing-machine.svg",
    technicianIndex: 1,
    description: "If the drum will not spin, makes a grinding noise or trips the power, we test the motor, capacitor and belt, then repair or replace the faulty part.",
  },
  {
    title: "Home Electrical Wiring Inspection",
    category: "Electrical",
    basePrice: 1800,
    estimatedDuration: "2 hours",
    serviceMode: "Home Visit",
    serviceArea: "Mirpur, Dhaka",
    image: "/services/electrical.svg",
    technicianIndex: 1,
    description: "A safe check of switches, sockets, breakers and visible wiring. You get a clear list of anything that needs attention, with no repair work done without approval.",
  },
] as const;

const ensureUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: "customer" | "technician";
  phone: string;
  area: string;
  bio: string;
}) => {
  const existing = await User.findOne({ email: data.email });
  if (!existing) {
    await auth.api.signUpEmail({
      body: { name: data.name, email: data.email, password: data.password },
    });
  }
  // BetterAuth writes ObjectId _ids into `users`; Mongoose casts them to strings.
  // Update by email so we never try to save a string id back as an ObjectId filter.
  // The role is only assigned when the account is first created, so roles an
  // admin later changes are never silently reset by re-running the seed.
  await User.updateOne(
    { email: data.email },
    {
      $set: {
        phone: data.phone,
        area: data.area,
        bio: data.bio,
        ...(existing ? {} : { role: data.role }),
      },
    },
  );
  const user = await User.findOne({ email: data.email });
  if (!user) throw new Error(`Could not create ${data.email}`);
  return user;
};

const run = async () => {
  await connectDatabase();

  const adminEmail = env.adminEmail.toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await auth.api.signUpEmail({
      body: {
        name: "FixMate Admin",
        email: adminEmail,
        password: env.adminPassword,
      },
    });
    await User.updateOne({ email: adminEmail }, { $set: { role: "admin" } });
  }

  const technicians = [];
  for (const technician of technicianSeeds) {
    await ensureUser(technician);
    const technicianUser = await User.findOne({ email: technician.email });
    if (!technicianUser) throw new Error(`Could not update ${technician.email}`);
    technicians.push(technicianUser);
  }
  const customer = await ensureUser(customerSeeds[0]);

  for (const seed of serviceSeeds) {
    const technician = technicians[seed.technicianIndex];
    await Service.findOneAndUpdate(
      { title: seed.title },
      {
        $set: {
          title: seed.title,
          category: seed.category,
          description: seed.description,
          image: seed.image,
          basePrice: seed.basePrice,
          estimatedDuration: seed.estimatedDuration,
          serviceMode: seed.serviceMode,
          serviceArea: seed.serviceArea,
          technicianName: technician.name,
          technicianEmail: technician.email,
          approvalStatus: "approved",
          isAvailable: true,
        },
      },
      { upsert: true },
    );
  }

  const seededServices = await Service.find({
    title: { $in: serviceSeeds.map((seed) => seed.title) },
  }).lean();

  if ((await Booking.countDocuments()) === 0) {
    const statuses = ["requested", "accepted", "in-progress", "completed", "cancelled"] as const;
    for (const [index, status] of statuses.entries()) {
      const service = seededServices.find((item) => item.title === serviceSeeds[index].title);
      if (!service) continue;
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
        paymentStatus: "unpaid",
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
          currency: "bdt",
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

  // Keep existing seed records in sync when prices or images are updated.
  for (const service of seededServices) {
    await Booking.updateMany(
      { serviceTitle: service.title },
      { $set: { serviceImage: service.image, basePrice: service.basePrice, finalAmount: service.basePrice } },
    );
    await Payment.updateMany(
      { serviceTitle: service.title },
      { $set: { amount: service.basePrice, currency: "bdt" } },
    );
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
