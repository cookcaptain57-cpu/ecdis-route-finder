/* eslint-disable */
import { useEffect } from “react”;

export default function Notif({msg,type,onClose}){
useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
return<div className={`notif notif-${type}`}>{type===“success”?“✅”:type===“error”?“❌”:“ℹ️”} {msg}</div>;
}
