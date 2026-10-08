const db = require("../config/db");
const { getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder,processDeliveredOrderGold } = require("../models/orderModel");

async function resolveOrderFields(body, oldOrder=null){
  const clientId=body.client_id||oldOrder?.client_id;
  if(!clientId) throw new Error("Client is required");
  const [rows]=await db.query("SELECT default_percentage FROM clients WHERE id=? LIMIT 1",[clientId]);
  if(!rows.length) throw new Error("Selected client was not found");
  // Respect an explicit per-order percentage from the Orders form. This
  // previously always fell back to the client's default_percentage even
  // when the user had typed a different value into the % field on edit —
  // so any manual override was silently discarded on save.
  const explicitPercentage = body.percentage ?? body.wastage_percent;
  const percentage = (explicitPercentage !== undefined && explicitPercentage !== null && explicitPercentage !== "" && !Number.isNaN(Number(explicitPercentage)))
    ? Number(explicitPercentage)
    : Number(oldOrder?.wastage_percent ?? rows[0].default_percentage ?? 2);
  const orderNumber=body.order_number||oldOrder?.order_number||`DC-${Date.now().toString().slice(-8)}`;
  const ornamentName=String(body.ornament_name||body.project_name||oldOrder?.ornament_name||"").trim();
  const weight=Number(body.gross_weight??body.gold_weight??oldOrder?.gross_weight??0);
  const goldEarned=Number(((weight*percentage)/100).toFixed(3));
  return {clientId,orderNumber,ornamentName,weight,stoneWeight:Number(body.stone_weight??oldOrder?.stone_weight??0),netGoldWeight:Number(body.net_gold_weight??weight),percentage,labourCharge:Number(body.labour_charge??oldOrder?.labour_charge??0),goldEarned,deliveryDate:body.delivery_date||oldOrder?.delivery_date||null,notes:body.notes??oldOrder?.notes??null,category:body.category||oldOrder?.category||"Custom"};
}
const getOrders=async(req,res)=>{try{const orders=await getAllOrders();res.json({success:true,orders});}catch(e){console.error("GET /orders",e);res.status(500).json({success:false,message:e.message});}};
const getOrder=async(req,res)=>{try{let order=await getOrderById(req.params.id);if(!order)return res.status(404).json({success:false,message:"Order not found"});await processDeliveredOrderGold(order);order=await getOrderById(req.params.id);res.json({success:true,order});}catch(e){res.status(500).json({success:false,message:e.message});}};
const addOrder=async(req,res)=>{try{const f=await resolveOrderFields(req.body);if(!f.ornamentName||f.weight<=0)return res.status(400).json({success:false,message:"Client, project name and gold weight are required"});const status=req.body.status==="Completed"?"Delivered":(req.body.status||"Pending");if(!["Pending","In Progress","Delivered"].includes(status))return res.status(400).json({success:false,message:"Invalid order status"});const id=await createOrder(f.clientId,f.orderNumber,f.ornamentName,f.weight,f.stoneWeight,f.netGoldWeight,f.percentage,f.labourCharge,f.goldEarned,f.deliveryDate,status,f.notes,f.category);if(status==="Delivered")await processDeliveredOrderGold(await getOrderById(id));res.status(201).json({success:true,message:"Order created successfully",id,order:await getOrderById(id)});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
// =====================================================
// QUICK STATUS UPDATE — used by the status-pill dropdown on
// the Orders page, where the request body only ever contains
// { status } (optionally delivery_date). The regular full edit
// below does ~8-9 sequential database round trips (client
// lookup, schema checks on three different tables, multiple
// re-fetches of the same order) — each one crossing from the
// Vercel server to the Hostinger database, which is what
// caused the noticeable lag on every status click. This path
// changes only the two columns that actually need to change
// and skips everything else, cutting that down to 2-4 round
// trips.
// =====================================================
const isQuickStatusBody = (body) => {
  const keys = Object.keys(body || {});
  return keys.length > 0 && keys.every((k) => k === "status" || k === "delivery_date") && "status" in body;
};

const editOrder=async(req,res)=>{try{
  if (isQuickStatusBody(req.body)) {
    const old = await getOrderById(req.params.id);
    if (!old) return res.status(404).json({success:false,message:"Order not found"});
    const status = req.body.status==="Completed" ? "Delivered" : req.body.status;
    if (!["Pending","In Progress","Delivered"].includes(status)) return res.status(400).json({success:false,message:"Invalid order status"});
    // Marking an order Completed sets its delivery date to today,
    // unless the caller explicitly passed a different date — a
    // completed order should show when it was actually finished,
    // not whatever date was originally entered when it was created.
    const deliveryDate = req.body.delivery_date || (status === "Delivered" ? new Date().toISOString().split("T")[0] : old.delivery_date);
    await db.query("UPDATE orders SET status=?, delivery_date=? WHERE id=?", [status, deliveryDate, req.params.id]);
    let updated = await getOrderById(req.params.id);
    const credited = await processDeliveredOrderGold(updated);
    if (credited) updated = await getOrderById(req.params.id);
    return res.json({success:true,message:"Order updated successfully",order:updated});
  }
  const old=await getOrderById(req.params.id);if(!old)return res.status(404).json({success:false,message:"Order not found"});const f=await resolveOrderFields(req.body,old);const status=req.body.status==="Completed"?"Delivered":(req.body.status||old.status||"Pending");await updateOrder(req.params.id,f.clientId,f.orderNumber,f.ornamentName,f.weight,f.stoneWeight,f.netGoldWeight,f.percentage,f.labourCharge,f.goldEarned,f.deliveryDate,status,f.notes,f.category);await processDeliveredOrderGold(await getOrderById(req.params.id));res.json({success:true,message:"Order updated successfully",order:await getOrderById(req.params.id)});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
const editOrder=async(req,res)=>{try{const old=await getOrderById(req.params.id);if(!old)return res.status(404).json({success:false,message:"Order not found"});const f=await resolveOrderFields(req.body,old);const status=req.body.status==="Completed"?"Delivered":(req.body.status||old.status||"Pending");await updateOrder(req.params.id,f.clientId,f.orderNumber,f.ornamentName,f.weight,f.stoneWeight,f.netGoldWeight,f.percentage,f.labourCharge,f.goldEarned,f.deliveryDate,status,f.notes,f.category);await processDeliveredOrderGold(await getOrderById(req.params.id));res.json({success:true,message:"Order updated successfully",order:await getOrderById(req.params.id)});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
>>>>>>> 542a8888f8fc1a8b362d8b1e4f28d43200e75905
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
const removeOrder=async(req,res)=>{try{if(!await getOrderById(req.params.id))return res.status(404).json({success:false,message:"Order not found"});await deleteOrder(req.params.id);res.json({success:true,message:"Order deleted successfully"});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
module.exports={getOrders,getOrder,addOrder,editOrder,removeOrder};
