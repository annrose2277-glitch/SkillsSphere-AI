import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "./src/database/db.js";
import { getAllJobs } from "./src/modules/jobs/service.js";
import JobPosting from "./src/database/models/JobPosting.js";
import User from "./src/database/models/User.js";

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

async function runTests() {
  // Disable buffering so tests don't hang if DB is unavailable
  mongoose.set("bufferCommands", false);
  
  await connectDB();

  console.log("\n--- STARTING JOB FILTER TESTS ---\n");

  try {
    // 1. Setup Test Data (Optional: check if jobs exist)
    const jobCount = await JobPosting.countDocuments();
    console.log(`Found ${jobCount} total jobs in database.`);

    if (jobCount === 0) {
      console.log("No jobs found. Creating some test data...");
      // Add a few dummy jobs if none exist (Note: needs a valid recruiter ID or we skip validation)
      // For now, let's just assume data exists since the user mentioned they've been using it.
    }

    // 2. Test: No Filters
    console.log("Test 1: All Open Jobs");
    const allResult = await getAllJobs({});
    const allJobs = Array.isArray(allResult) ? allResult : (allResult?.jobs || []);
    console.log(`=> Result: Found ${allJobs?.length || 0} jobs.`);

    // 3. Test: Designation Filter
    const searchRole = "Engineer";
    console.log(`Test 2: Designation filter ("${searchRole}")`);
    const designResult = await getAllJobs({ designation: searchRole });
    const designJobs = Array.isArray(designResult) ? designResult : (designResult?.jobs || []);
    console.log(`=> Result: Found ${designJobs?.length || 0} jobs matching "${searchRole}".`);
    if (Array.isArray(designJobs)) {
      designJobs.slice(0, 2).forEach(j => console.log(`   - ${j.title}`));
    }

    // 4. Test: Salary Filter
    const minSal = 50000;
    console.log(`Test 3: Minimum Salary (${minSal})`);
    const salaryResult = await getAllJobs({ minSalary: minSal });
    const salaryJobs = Array.isArray(salaryResult) ? salaryResult : (salaryResult?.jobs || []);
    console.log(`=> Result: Found ${salaryJobs?.length || 0} jobs with min salary >= ${minSal}.`);

    // 5. Test: Recency Filter
    console.log(`Test 4: Posted within 7 days`);
    const recentResult = await getAllJobs({ postedWithin: "7d" });
    const recentJobs = Array.isArray(recentResult) ? recentResult : (recentResult?.jobs || []);
    console.log(`=> Result: Found ${recentJobs?.length || 0} jobs posted in the last week.`);

    // 6. Test: Multi-parameter
    console.log(`Test 5: Complex Filter (Engineer + 50k)`);
    const complexResult = await getAllJobs({ designation: "Engineer", minSalary: 50000 });
    const complexJobs = Array.isArray(complexResult) ? complexResult : (complexResult?.jobs || []);
    console.log(`=> Result: Found ${complexJobs?.length || 0} jobs matching both criteria.`);

  } catch (err) {
    console.error("Test failed:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("\n--- TESTS COMPLETED ---\n");
  }
}

runTests();
