import type { Assignment } from "../../types.js";

import { s3Ch09DoubleAll } from "./s3/01-double-all.js";
import { s3Ch09OnlyPositive } from "./s3/02-only-positive.js";
import { s3Ch09SumWithReduce } from "./s3/03-sum-with-reduce.js";
import { s3Ch09NamesOf } from "./s3/04-names-of.js";
import { s3Ch09Adults } from "./s3/05-adults.js";
import { s3Ch09CountTrue } from "./s3/06-count-true.js";
import { s3Ch09FindByName } from "./s3/07-find-by-name.js";
import { s3Ch09PipelineCapstone } from "./s3/08-pipeline-capstone.js";
import { s4Ch09MyMap } from "./s4/01-my-map.js";
import { s4Ch09Partition } from "./s4/02-partition.js";
import { s4Ch09GroupBy } from "./s4/03-group-by.js";
import { s4Ch09Scan } from "./s4/04-scan.js";
import { s4Ch09PipelineCapstone } from "./s4/05-pipeline-capstone.js";
import { s5Ch09BuildLeaderboard } from "./s5/01-build-leaderboard.js";
import { s5Ch09PipeReports } from "./s5/02-pipe-reports.js";
import { s5Ch09MonthlySalesReportCapstone } from "./s5/03-monthly-sales-report-capstone.js";

export const ch09HigherOrder: Assignment[] = [
  s3Ch09DoubleAll,
  s3Ch09OnlyPositive,
  s3Ch09SumWithReduce,
  s3Ch09NamesOf,
  s3Ch09Adults,
  s3Ch09CountTrue,
  s3Ch09FindByName,
  s3Ch09PipelineCapstone,
  s4Ch09MyMap,
  s4Ch09Partition,
  s4Ch09GroupBy,
  s4Ch09Scan,
  s4Ch09PipelineCapstone,
  s5Ch09BuildLeaderboard,
  s5Ch09PipeReports,
  s5Ch09MonthlySalesReportCapstone,
];
