"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";

export default function DepartmentsClient({
  staffData = [],
  departments = [],
  supportUnits = [],
  projects = [],
  publications = [],
}) {
  const departmentList = Array.isArray(departments) ? departments : [];
  
  const departmentGroups = useMemo(() => {
    const groups = {};
    for (const dept of departmentList) {
      const type = (dept?.type || "research").toString();
      if (!groups[type]) groups[type] = [];
      groups[type].push(dept);
    }
    // sort each group by name
    Object.values(groups).forEach((list) => list.sort((a, b) => (a?.name || "").localeCompare(b?.name || "", "ro", { sensitivity: "base", numeric: true })));
    return groups;
  }, [departmentList]);

  const supportUnitsList = useMemo(() => {
    const passed = Array.isArray(supportUnits) ? supportUnits : [];
    
    // Check if static units are already present to avoid duplicates
    const hasTech = passed.some(u => u.name === "Technology Transfer & Development Unit");
    const hasHPC = passed.some(u => u.name === "HPC-AI Services");

    const extra = [];
    if (!hasTech) {
      extra.push({
        name: "Technology Transfer & Development Unit",
        slug: "technology-transfer-development-unit",
        type: "support",
        description: "",
        coordinator: "",
      });
    }

    if (!hasHPC) {
      extra.push({
        name: "HPC-AI Services",
        slug: "hpc-ai-services",
        type: "support",
        description: "",
        coordinator: "",
      });
    }
    
    return [...passed, ...extra];
  }, [supportUnits]);

  const typeLabel = (type) => {
    const map = {
      research: "Research Departments",
      academic: "Academic Departments",
      support: "Support Departments",
      other: "Departments",
    };
    return map[type] || type || "Departments";
  };

  // Count projects and staff for each department
  const projectList = Array.isArray(projects) ? projects : [];
  const staffList = Array.isArray(staffData) ? staffData : [];

  const getDeptStats = (deptName, deptSlug) => {
    const projectCount = projectList.filter((p) => {
      const domains = Array.isArray(p.domain) ? p.domain : [];
      return domains.some((d) => {
        const domainName = typeof d === 'string' ? d : d?.name;
        return domainName?.toLowerCase() === deptName?.toLowerCase();
      });
    }).length;

    const memberCount = staffList.filter((s) => {
      const depName = String(s?.department || "").trim().toLowerCase();
      const depSlug = String(s?.departmentInfo?.slug || "").trim();
      return depName === deptName?.toLowerCase() || depSlug === deptSlug;
    }).length;

    return { projectCount, memberCount };
  };

  return (
    <main className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">Departments</h1>
            <p className="page-header-subtitle">
              Explore our research and support departments at AIRi @ UTCN
            </p>
          </motion.div>

          {/* Research Departments */}
          {Object.entries(departmentGroups).map(([type, units]) => (
            <div key={type} className="mb-12">
              <motion.h2
                variants={itemVariants}
                className="heading-2 heading-accent text-center mb-6"
              >
                {typeLabel(type)}
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {units.map((unit, index) => {
                  const stats = getDeptStats(unit.name, unit.slug);
                  return (
                    <motion.div
                      key={`${type}-${unit.slug || index}`}
                      variants={itemVariants}
                    >
                      <Link
                        href={`/research/departments/${unit.slug}`}
                        className="card card-hover p-5 block group h-full"
                      >
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                          {unit.name}
                        </h3>
                        {unit.summary && (
                          <p className="text-sm text-muted mt-2 line-clamp-2">
                            {unit.summary}
                          </p>
                        )}
                        <div className="flex gap-4 mt-3 text-xs text-muted">
                          <span>{stats.memberCount} members</span>
                          <span>{stats.projectCount} projects</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Support Units */}
          {supportUnitsList.length > 0 && (
            <div className="mb-12">
              <motion.h2
                variants={itemVariants}
                className="heading-2 heading-accent text-center mb-6"
              >
                Support Departments
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {supportUnitsList.map((unit, index) => (
                  <motion.div
                    key={`support-${unit.slug || index}`}
                    variants={itemVariants}
                  >
                    <Link
                      href={`/research/departments/${unit.slug}`}
                      className="card card-hover p-5 block group h-full"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-accent-400 transition-colors">
                        {unit.name}
                      </h3>
                      {unit.summary && (
                        <p className="text-sm text-muted mt-2 line-clamp-2">
                          {unit.summary}
                        </p>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
