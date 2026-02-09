export const metadata = {
  title: "ICIA - Datasets",
};

import DatasetsClient from "./datasetsClient";
import { getDatasets, getStaff, transformDatasetData, transformStaffData } from "@/lib/strapi";

export default async function DatasetsPage() {
  const [staffData, datasetsData] = await Promise.all([
     getStaff(),
     getDatasets()
  ]);
  
  const staff = transformStaffData(staffData);
  const datasets = transformDatasetData(datasetsData);

  return <DatasetsClient staffData={staff} datasets={datasets} />;
}