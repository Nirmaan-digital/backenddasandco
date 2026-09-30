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
const editOrder=async(req,res)=>{try{const old=await getOrderById(req.params.id);if(!old)return res.status(404).json({success:false,message:"Order not found"});const f=await resolveOrderFields(req.body,old);const status=req.body.status==="Completed"?"Delivered":(req.body.status||old.status||"Pending");await updateOrder(req.params.id,f.clientId,f.orderNumber,f.ornamentName,f.weight,f.stoneWeight,f.netGoldWeight,f.percentage,f.labourCharge,f.goldEarned,f.deliveryDate,status,f.notes,f.category);await processDeliveredOrderGold(await getOrderById(req.params.id));res.json({success:true,message:"Order updated successfully",order:await getOrderById(req.params.id)});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
const removeOrder=async(req,res)=>{try{if(!await getOrderById(req.params.id))return res.status(404).json({success:false,message:"Order not found"});await deleteOrder(req.params.id);res.json({success:true,message:"Order deleted successfully"});}catch(e){console.error(e);res.status(500).json({success:false,message:e.message});}};
module.exports={getOrders,getOrder,addOrder,editOrder,removeOrder};
