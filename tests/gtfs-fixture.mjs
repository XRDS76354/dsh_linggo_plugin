import { execFileSync } from "node:child_process";
import { python } from "./host.mjs";

/** Generated feed only: two routes, with complete, absent or partially absent shapes. */
export function writeGtfs(path, shapes = "none", broken = false) {
  const files = {
    "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\nS1,一号站,31,121\nS2,二号站,31.01,121.01\n",
    "routes.txt": "route_id,route_short_name,route_type\nR1,1路,3\nR2,2路,3\n",
    "trips.txt": "route_id,service_id,trip_id,direction_id,shape_id\nR1,WK,T1,0,A\nR2,WK,T2,0,B\n",
    "stop_times.txt": "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,06:00:00,06:00:00,S1,1\nT1,06:10:00,06:10:00,S2,2\nT2,07:00:00,07:00:00,S2,1\nT2,07:10:00,07:10:00,S1,2\n",
  };
  if (shapes !== "none") files["shapes.txt"] = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nA,31,121,1\nA,31.01,121.01,2\n" +
    (shapes === "complete" ? "B,31.01,121.01,1\nB,31,121,2\n" : "");
  if (broken) delete files["stops.txt"];
  execFileSync(python, ["-c", "import json,sys,zipfile; f=json.loads(sys.stdin.buffer.read().decode('utf-8')); z=zipfile.ZipFile(sys.argv[1],'w'); [z.writestr(k,v) for k,v in f.items()]; z.close()", path], {
    input: JSON.stringify(files), windowsHide: true,
  });
}
