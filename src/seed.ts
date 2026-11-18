import { ensureDB } from "./app.js";
import { auth } from "./lib/auth.js";
import { Service } from "./models/Service.js";
import { Booking } from "./models/Booking.js";
import { Payment } from "./models/Payment.js";
import mongoose from "mongoose";

const USERS = [
  { name: "FixMate Admin", email: "admin@fixmate.test", password: "Admin@12345", role: "admin", area: "Dhanmondi, Dhaka" },
  { name: "Arif Hossain", email: "arif@fixmate.test", password: "Tech@12345", role: "technician", area: "Dhanmondi, Dhaka", bio: "8+ years repairing smartphones, laptops and home appliances." },
  { name: "Nabil Ahmed", email: "nabil@fixmate.test", password: "Tech@12345", role: "technician", area: "Gulshan, Dhaka", bio: "Certified AC and refrigerator technician." },
  { name: "Sara Rahman", email: "sara@fixmate.test", password: "Cust@12345", role: "customer", area: "Dhanmondi, Dhaka" },
];

async function upsertUser(u: typeof USERS[number]) {
  try {
    await auth.api.signUpEmail({ body: { email: u.email, password: u.password, name: u.name, role: u.role } as any });
  } catch (e: any) {
    // likely exists; ignore
  }
  const db = mongoose.connection.db!;
  await db.collection("user").updateOne({ email: u.email }, { $set: { role: u.role, area: u.area, bio: (u as any).bio, phone: "01812345678" } });
}

async function main() {
  await ensureDB();
  console.log("Seeding users...");
  for (const u of USERS) await upsertUser(u);

  const arif = "arif@fixmate.test";
  const nabil = "nabil@fixmate.test";

  console.log("Seeding services...");
  await Service.deleteMany({});
  const servicesData = [
    { title: "iPhone Screen Replacement", category: "Smartphone", description: "OEM-grade screen replacement with 90-day warranty.", image: "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=600", basePrice: 18, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "Android Battery & Charging Port", category: "Smartphone", description: "Battery replacement and charging port micro-soldering.", image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600", basePrice: 12, estimatedDuration: "1-2 hours", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "Laptop Keyboard & SSD Upgrade", category: "Laptop & PC", description: "Keyboard replacement and SSD/RAM upgrade.", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600", basePrice: 25, estimatedDuration: "1 day", serviceMode: "Shop Drop-off", serviceArea: "Mirpur, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "Laptop Motherboard Repair", category: "Laptop & PC", description: "Chip-level motherboard diagnostics and repair.", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600", basePrice: 40, estimatedDuration: "2-3 days", serviceMode: "Shop Drop-off", serviceArea: "Dhanmondi, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "AC Cleaning & Gas Refill", category: "AC", description: "Deep cleaning, gas refill and performance check.", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600", basePrice: 30, estimatedDuration: "2 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "AC Installation", category: "AC", description: "New AC unit installation with copper piping.", image: "https://images.unsplash.com/photo-1631545806609-3b7a6a7a0c6e?w=600", basePrice: 50, estimatedDuration: "3-4 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "Refrigerator Repair", category: "Refrigerator", description: "Compressor, thermostat and gas refill service.", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600", basePrice: 28, estimatedDuration: "2-4 hours", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "Fridge Not Cooling Diagnosis", category: "Refrigerator", description: "Full diagnostic for cooling issues.", image: "https://images.unsplash.com/photo-1584568674263-2a4e5c4d3b8f?w=600", basePrice: 15, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "TV Panel & Board Repair", category: "TV", description: "LED/LCD panel and main board repair.", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600", basePrice: 24, estimatedDuration: "1-2 days", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "Smart TV Software & Apps", category: "TV", description: "Software update, app install and remote pairing.", image: "https://images.unsplash.com/photo-1461151304267-38535e768fb7?w=600", basePrice: 10, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "Washing Machine Repair", category: "Washing Machine", description: "Motor, drum and drainage repair.", image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600", basePrice: 20, estimatedDuration: "2-3 hours", serviceMode: "Home Visit", serviceArea: "Mirpur, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "approved", isAvailable: true },
    { title: "Electrical Wiring & Safety Check", category: "Electrical", description: "Full home wiring inspection and repair.", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600", basePrice: 26, estimatedDuration: "3-5 hours", serviceMode: "Home Visit", serviceArea: "Dhanmondi, Dhaka", technicianName: "Arif Hossain", technicianEmail: arif, approvalStatus: "approved", isAvailable: true },
    { title: "Ceiling Fan Installation", category: "Electrical", description: "Fan installation and regulator repair.", image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=600", basePrice: 8, estimatedDuration: "1 hour", serviceMode: "Home Visit", serviceArea: "Gulshan, Dhaka", technicianName: "Nabil Ahmed", technicianEmail: nabil, approvalStatus: "pending", isAvailable: true },
  ];
  await Service.insertMany(servicesData);

  console.log("Seeding bookings...");
  await Booking.deleteMany({});
  const svc1 = await Service.findOne({ title: "iPhone Screen Replacement" });
  const svc2 = await Service.findOne({ title: "AC Cleaning & Gas Refill" });
  const svc3 = await Service.findOne({ title: "Laptop Keyboard & SSD Upgrade" });
  const bookings = [
    { serviceId: svc1!._id.toString(), serviceTitle: svc1!.title, serviceImage: svc1!.image, category: svc1!.category, basePrice: svc1!.basePrice, technicianName: svc1!.technicianName, technicianEmail: svc1!.technicianEmail, customerName: "Sara Rahman", customerEmail: "sara@fixmate.test", customerPhone: "01712345678", address: "House 12, Road 5, Dhanmondi", preferredDate: new Date(Date.now()+86400000), problemDescription: "Screen cracked after drop, touch partially working.", status: "completed", finalAmount: 18, paymentStatus: "paid", statusHistory: [{status:"requested",changedAt:new Date()},{status:"completed",changedAt:new Date()}] },
    { serviceId: svc2!._id.toString(), serviceTitle: svc2!.title, serviceImage: svc2!.image, category: svc2!.category, basePrice: svc2!.basePrice, technicianName: svc2!.technicianName, technicianEmail: svc2!.technicianEmail, customerName: "Sara Rahman", customerEmail: "sara@fixmate.test", customerPhone: "01712345678", address: "Apt 4B, Gulshan 2", preferredDate: new Date(Date.now()+2*86400000), problemDescription: "AC not cooling, making loud noise.", status: "in-progress", finalAmount: svc2!.basePrice, paymentStatus: "unpaid", statusHistory: [{status:"requested",changedAt:new Date()},{status:"in-progress",changedAt:new Date()}] },
    { serviceId: svc3!._id.toString(), serviceTitle: svc3!.title, serviceImage: svc3!.image, category: svc3!.category, basePrice: svc3!.basePrice, technicianName: svc3!.technicianName, technicianEmail: svc3!.technicianEmail, customerName: "Sara Rahman", customerEmail: "sara@fixmate.test", customerPhone: "01712345678", address: "Mirpur 10", preferredDate: new Date(Date.now()+3*86400000), problemDescription: "Laptop keyboard not responding, want SSD upgrade.", status: "requested", finalAmount: svc3!.basePrice, paymentStatus: "unpaid", statusHistory: [{status:"requested",changedAt:new Date()}] },
    { serviceId: svc1!._id.toString(), serviceTitle: svc1!.title, serviceImage: svc1!.image, category: svc1!.category, basePrice: svc1!.basePrice, technicianName: svc1!.technicianName, technicianEmail: svc1!.technicianEmail, customerName: "Sara Rahman", customerEmail: "sara@fixmate.test", customerPhone: "01712345678", address: "Dhanmondi", preferredDate: new Date(Date.now()-86400000), problemDescription: "Battery draining fast.", status: "cancelled", finalAmount: svc1!.basePrice, paymentStatus: "unpaid", statusHistory: [{status:"requested",changedAt:new Date()},{status:"cancelled",changedAt:new Date()}] },
    { serviceId: svc2!._id.toString(), serviceTitle: svc2!.title, serviceImage: svc2!.image, category: svc2!.category, basePrice: svc2!.basePrice, technicianName: svc2!.technicianName, technicianEmail: svc2!.technicianEmail, customerName: "Sara Rahman", customerEmail: "sara@fixmate.test", customerPhone: "01712345678", address: "Gulshan", preferredDate: new Date(Date.now()-2*86400000), problemDescription: "Leaking water.", status: "rejected", finalAmount: svc2!.basePrice, paymentStatus: "unpaid", statusHistory: [{status:"requested",changedAt:new Date()},{status:"rejected",changedAt:new Date()}] },
  ];
  const created = await Booking.insertMany(bookings);
  // payment for completed paid booking
  const paidBooking = created[0];
  await Payment.create({
    bookingId: paidBooking._id.toString(),
    serviceTitle: paidBooking.serviceTitle,
    customerName: paidBooking.customerName,
    customerEmail: paidBooking.customerEmail,
    technicianName: paidBooking.technicianName,
    technicianEmail: paidBooking.technicianEmail,
    amount: paidBooking.finalAmount,
    currency: "usd",
    transactionId: "pi_seed_001",
    stripeSessionId: "cs_seed_001",
    paymentStatus: "paid",
    paidAt: new Date(),
  });

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
