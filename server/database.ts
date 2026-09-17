/* ==========================================================================
   N.F INTERNATIONAL - MONGODB DATA LAYER (TYPESCRIPT)
   ========================================================================== */

// Netlify's Node 18 Function runtime does not always expose Web Crypto globally.
// Mongoose uses it while generating ObjectIds, so provide Node's built-in implementation.
import crypto from 'crypto';
if (!globalThis.crypto) {
  (globalThis as unknown as { crypto: unknown }).crypto = crypto.webcrypto;
}

import path from 'path';
import dotenv from 'dotenv';
import mongoose, { Schema, SchemaOptions, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });


export interface IAdmin {
  username: string;
  password_hash: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IJob {
  title: string;
  category: string;
  country: string;
  city?: string;
  contract?: string;
  benefits?: string;
  salary?: string;
  vacancies: number;
  active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface IApplication {
  job_title: string;
  applicant_name: string;
  applicant_phone: string;
  passport_status?: string;
  experience?: string;
  submitted_at?: Date;
}

export interface IInquiry {
  name: string;
  email?: string;
  phone: string;
  message: string;
  submitted_at?: Date;
}

export interface IEmployee {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

const baseOptions: SchemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
};

const submissionOptions: SchemaOptions = {
  versionKey: false,
  timestamps: { createdAt: 'submitted_at', updatedAt: false }
};

const AdminSchema = new Schema<IAdmin>({
  username: { type: String, required: true, unique: true, trim: true },
  password_hash: { type: String, required: true }
}, baseOptions);

const JobSchema = new Schema<IJob>({
  title: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  country: { type: String, required: true, trim: true },
  city: { type: String, default: '' },
  contract: { type: String, default: '' },
  benefits: { type: String, default: '' },
  salary: { type: String, default: '' },
  vacancies: { type: Number, default: 1, min: 1 },
  active: { type: Boolean, default: true }
}, baseOptions);

const ApplicationSchema = new Schema<IApplication>({
  job_title: { type: String, default: 'General Application' },
  applicant_name: { type: String, required: true, trim: true },
  applicant_phone: { type: String, required: true, trim: true },
  passport_status: { type: String, default: '' },
  experience: { type: String, default: '' }
}, submissionOptions);

const InquirySchema = new Schema<IInquiry>({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  phone: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true }
}, submissionOptions);

const EmployeeSchema = new Schema<IEmployee>({
  name: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, baseOptions);

export const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
export const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
export const Application: Model<IApplication> = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
export const Inquiry: Model<IInquiry> = mongoose.models.Inquiry || mongoose.model<IInquiry>('Inquiry', InquirySchema);
export const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

const seedJobs: IJob[] = [
  ['Senior Steel Fixer & Mason', 'construction', 'Saudi Arabia', 'Riyadh', '2 Years (Renewable)', 'Accommodation & Food Provided', '1,500 - 1,800 SAR', 25],
  ['Staff Nurse (Female)', 'healthcare', 'UAE', 'Dubai', '2 Years (DHA Approved)', 'Medical Insurance & Overtime', '4,500 - 6,000 AED', 10],
  ['HVAC Technician & Electrician', 'engineering', 'Qatar', 'Doha', '2 Years', '3+ Yrs Experience Required', '2,200 - 2,800 QAR', 8],
  ['Hotel Waiter & Kitchen Crew', 'hospitality', 'Malaysia', 'Kuala Lumpur', '3 Years', 'Duty Meals & Uniform', '1,800 - 2,200 MYR', 15],
  ['Heavy Trailer Driver', 'logistics', 'Oman', 'Muscat', '2 Years', 'GCC / Valid License Required', '250 - 320 OMR', 12],
  ['Pipe Fitter & Shuttering Carpenter', 'construction', 'Saudi Arabia', 'Jeddah', '2 Years', 'Complete PPE Included', '1,400 - 1,700 SAR', 30]
].map(([title, category, country, city, contract, benefits, salary, vacancies]) => ({
  title: String(title),
  category: String(category),
  country: String(country),
  city: String(city),
  contract: String(contract),
  benefits: String(benefits),
  salary: String(salary),
  vacancies: Number(vacancies),
  active: true
}));

export async function connect(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nf_international';
  const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map(server => server.trim())
    .filter(Boolean);

  if (uri.startsWith('mongodb+srv://') && dnsServers.length) {
    dns.setServers(dnsServers);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  if (!await Admin.exists({ username: 'nfadmin' })) {
    await Admin.create({
      username: 'nfadmin',
      password_hash: await bcrypt.hash('mamun123', 10)
    });
  }

  if (await Job.countDocuments() === 0) {
    await Job.insertMany(seedJobs);
  }

  console.log(`✔ Connected to MongoDB database: ${mongoose.connection.name}`);
}

export function cleanJob(data: Record<string, unknown>): Partial<IJob> {
  return {
    title: String(data.title || ''),
    category: String(data.category || ''),
    country: String(data.country || ''),
    city: data.city ? String(data.city) : '',
    contract: data.contract ? String(data.contract) : '',
    benefits: data.benefits ? String(data.benefits) : '',
    salary: data.salary ? String(data.salary) : '',
    vacancies: Number(data.vacancies) || 1,
    active: data.active === undefined ? true : Boolean(Number(data.active))
  };
}

export const getAdminByUsername = (username: string) => Admin.findOne({ username }).lean();
export const getAllJobs = () => Job.find().sort({ created_at: -1 }).lean();
export const createJob = (data: Record<string, unknown>) => Job.create(cleanJob(data));
export const updateJob = (id: string, data: Record<string, unknown>) => Job.findByIdAndUpdate(id, cleanJob(data), { new: true }).lean();
export const deleteJob = async (id: string): Promise<boolean> => Boolean(await Job.findByIdAndDelete(id));

export const getAllApplications = () => Application.find().sort({ submitted_at: -1 }).lean();
export const createApplication = (data: Record<string, unknown>) => Application.create({
  job_title: data.job_title ? String(data.job_title) : 'General Application',
  applicant_name: String(data.applicant_name || ''),
  applicant_phone: String(data.applicant_phone || ''),
  passport_status: data.passport_status ? String(data.passport_status) : '',
  experience: data.experience ? String(data.experience) : ''
});
export const deleteApplication = async (id: string): Promise<boolean> => Boolean(await Application.findByIdAndDelete(id));

export const getAllInquiries = () => Inquiry.find().sort({ submitted_at: -1 }).lean();
export const createInquiry = (data: Record<string, unknown>) => Inquiry.create({
  name: String(data.name || ''),
  email: data.email ? String(data.email) : '',
  phone: String(data.phone || ''),
  message: String(data.message || '')
});
export const deleteInquiry = async (id: string): Promise<boolean> => Boolean(await Inquiry.findByIdAndDelete(id));

export const getAllEmployees = () => Employee.find().sort({ created_at: -1 }).lean();
export const createEmployee = (data: Record<string, unknown>) => Employee.create({
  name: String(data.name || ''),
  role: String(data.role || ''),
  phone: data.phone ? String(data.phone) : '',
  email: data.email ? String(data.email) : '',
  status: (data.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
});
export const deleteEmployee = async (id: string): Promise<boolean> => Boolean(await Employee.findByIdAndDelete(id));

const database = {
  connect,
  cleanJob,
  getAdminByUsername,
  getAllJobs,
  createJob,
  updateJob,
  deleteJob,
  getAllApplications,
  createApplication,
  deleteApplication,
  getAllInquiries,
  createInquiry,
  deleteInquiry,
  getAllEmployees,
  createEmployee,
  deleteEmployee
};

export default database;
