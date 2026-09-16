"use client";

import CatalogNotice from "@/components/CatalogNotice";
import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";

export default function DepartmentsClient({
  staffData = [],
  departments = [],
  projects = [],
  publications = [],
  pageData,
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

  const typeLabel = (type) => {
    switch (type) {
      case "research":
        return pageData?.departmentTypeResearch || "Research Departments";
      case "networks":
        return pageData?.departmentTypeNetworks || "Research Networks";
      case "support":
        return pageData?.departmentTypeSupport || "Support Departments";
      default:
        return pageData?.departmentTypeOther || "Departments";
    }
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

  const title = pageData?.departmentsTitle || "Departments";
  const subtitle = pageData?.departmentsSubtitle || "Discover our research departments, centers, and specialized units advancing artificial intelligence.";
  const membersTemplate = pageData?.departmentsMembersCount || "{count} members";
  const projectsTemplate = pageData?.departmentsProjectsCount || "{count} projects";

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="page-header">
            <h1 className="page-header-title">{title}</h1>
            <p className="page-header-subtitle">
              {subtitle}
            </p>
          </motion.div>

          <CatalogNotice className="mb-8" />

          {departmentList.length === 0 && <CatalogNotice isEmpty={true} />}

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
                          <span>{membersTemplate.replace("{count}", stats.memberCount)}</span>
                          <span>{projectsTemplate.replace("{count}", stats.projectCount)}</span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

        </motion.div>
      </div>
    </div>
  );
}
