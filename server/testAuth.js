const auth = (...allowedRoles) => {
  const user = { role: "professor" };
  console.log("Allowed Roles:", allowedRoles);
  console.log("Length:", allowedRoles.length);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log("Result: Forbidden");
  } else {
    console.log("Result: Allowed");
  }
};

console.log("Testing auth('professor')");
auth("professor");
console.log("\nTesting auth('professor', 'admin')");
auth("professor", "admin");
