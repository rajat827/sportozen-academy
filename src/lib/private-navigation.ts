// Full navigation discards private React and router state when changing tenant or signing out.
export function navigatePrivateWorkspace(path:string) {
  const destination=new URL(path,window.location.origin);
  if(destination.origin!==window.location.origin)throw new Error("Workspace navigation must remain on this origin.");
  window.location.assign(destination.href);
}
