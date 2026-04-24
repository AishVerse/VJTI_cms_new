// import { Link } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import { Button } from "./ui/Button";

// export function Navbar({ onMenu }: { onMenu?: () => void }) {
//   const { user, logout } = useAuth();
//   const home =
//     user?.role === "Admin"
//       ? "/admin"
//       : user?.role === "Student" || user?.role === "Faculty"
//         ? "/complaints"
//         : "/dashboard";
//   return (
//     <header className="sticky top-0 z-40 border-b border-red-900 bg-[#c62828] shadow-md dark:border-slate-800 dark:bg-red-900">
//       <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
//         <div className="flex items-center gap-4">
//           {onMenu ? (
//             <Button variant="ghost" className="md:hidden !px-2 text-white hover:bg-white/10 hover:text-white dark:hover:bg-black/20" type="button" onClick={onMenu}>
//               Menu
//             </Button>
//           ) : null}
//           <Link to={home} className="group flex items-center gap-3">
//             <img
//               // src="/assets/vjti-logo-wide.png"
//               src="/assets/vjti-logo.png"
//               alt="VJTI CMS"
//               className="h-14 w-auto transition-transform duration-200 group-hover:scale-[1.03] "
//               loading="eager"
//             />
//             <div className="flex flex-col">
//               <span className="text-2xl font-bold text-white transition-transform duration-200 group-hover:scale-[1.03]">
//                 VJTI CMS
//               </span>
//               <span className="text-sm font-bold text-white transition-transform duration-200 group-hover:scale-[1.03]">
//                 VJTI Complaint Management System
//               </span>
//             </div>
//           </Link>
//         </div>
//         <div className="flex items-center gap-4">
//           {user ? (
//             <>
//               <span className="hidden text-sm text-white/90 sm:inline">
//                 {user.name} · <span className="font-semibold text-white">{user.role}</span>
//               </span>
//               <Button variant="secondary" className="!bg-white !text-[#c62828] hover:!bg-red-50 font-semibold" type="button" onClick={logout}>
//                 Log out
//               </Button>
//             </>
//           ) : (
//             <>
//               <Link to="/login">
//                 <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" type="button">
//                   Log in
//                 </Button>
//               </Link>
//               <Link to="/signup">
//                 <Button variant="secondary" className="!bg-white !text-[#c62828] hover:!bg-red-50 font-semibold" type="button">Sign up</Button>
//               </Link>
//             </>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// }


import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";

export function Navbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();

  const home =
    user?.role === "Admin"
      ? "/admin"
      : user?.role === "Student" || user?.role === "Faculty"
      ? "/complaints"
      : "/dashboard";

  return (
    <header className="sticky top-0 z-40 bg-[#c62828] shadow-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* LEFT SIDE */}
        <div className="flex items-center gap-4">
          
          {/* Mobile Menu */}
          {onMenu && (
            <Button
              variant="ghost"
              className="md:hidden !px-2 text-white hover:bg-white/10"
              type="button"
              onClick={onMenu}
            >
              Menu
            </Button>
          )}

          {/* LOGO + TEXT */}
          <Link to={home} className="flex items-center gap-3">
            
            {/* LOGO */}
            <img
              src="/assets/vjti-logo.png"
              alt="VJTI Logo"
              className="h-12 w-auto object-contain bg-white p-1 rounded"
            />

            {/* TEXT */}
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-white">
                VJTI CMS
              </span>
              <span className="text-xs text-white/90">
                Complaint Management System
              </span>
            </div>
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden text-sm text-white sm:inline">
                {user.name} ·{" "}
                <span className="font-semibold">{user.role}</span>
              </span>

              <Button
                variant="secondary"
                className="!bg-white !text-[#c62828] hover:!bg-red-50 font-semibold"
                onClick={logout}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                >
                  Log in
                </Button>
              </Link>

              <Link to="/signup">
                <Button
                  variant="secondary"
                  className="!bg-white !text-[#c62828] hover:!bg-red-50 font-semibold"
                >
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
