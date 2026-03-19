export const metadata = {
  title: "Awards",
  description: "Awards and recognitions received by AIRi researchers and teams at UTCN.",
};

import AwardsClient from "./awardsClient";

export default function AwardsPage() {
  return <AwardsClient />;
}
