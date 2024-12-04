const table = require("../models/table");
const dateTimeValidator = require("../utils/dateAndTimeValidator");
import db from "../models/index";
import mailer from "./mailService";
const invoiceService = require("../services/invoiceService");

let getAllOrders = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let orders = await db.Order.findAll();

      resolve({
        status: 200,
        message: "OK",
        data: orders,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const validateTime = (currDate, resDate, resTime) => {
  if (resDate === dateTimeValidator.asDateString(currDate)) {
    if (resTime < dateTimeValidator.asTimeString(currDate)) {
      throw {
        status: 400,
        message: "ERROR: Given time is in the past!",
      };
    }
  }
};

const isFieldEmpty = (payload) => {
  if (
    !payload.fullName ||
    !payload.phone ||
    !payload.email ||
    !payload.resDate ||
    !payload.resTime ||
    !payload.people
  ) {
    throw {
      status: 400,
      message: "Please fill in all fields!",
    };
  }
};

let getAllOrdersByRestaurantId = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.restaurantId) {
        resolve({
          status: 400,
          message: "Missing required parameter!",
          data: "",
        });
      } else {
        let orders = await db.Order.findAll({
          where: { restaurantId: data.restaurantId },
        });

        resolve({
          status: 200,
          message: "OK",
          data: orders,
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

let updateStatusOrder = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.orderId || !data.status) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
      }
      let order = await db.Order.findOne({
        where: { id: data.orderId },
        raw: false,
      });
      if (!order) {
        resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
      }

      order.resStatus = data.status;
      await order.save();
      let bookedTables = await db.OrderTable.findAll({
        where: {
          orderId: data.orderId,
        },
        raw: false,
      });
      for (let i = 0; i < bookedTables.length; i++) {
        let table = await db.Table.findOne({
          where: {
            id: bookedTables[i].tableId,
          },
          raw: false,
        });
        await table.save();
      }

      resolve({
        status: 200,
        message: "Update order status success!",
        data: order,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const createOrderByStaff = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.resTime ||
        !data.resDate ||
        !data.people ||
        !data.restaurantId ||
        !data.tables
      ) {
        return resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
      }
      let order;
      order = await db.Order.create({
        resStatus: "pending",
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        resDate: data.resDate,
        resTime: data.resTime,
        people: data.people,
        depositAmount: 0,
        restaurantId: data.restaurantId,
      });
      let totalDepositAmount = 0;
      for (let item of data.orderItemArray) {
        let dish = await db.Dish.findOne({
          where: { id: item.dishId },
          raw: false,
        });
        let price = dish.price * item.quantity;
        let depositAmount = price * 0.3;
        totalDepositAmount += depositAmount;
        await db.OrderItem.create({
          orderId: order.id,
          dishId: item.dishId,
          quantity: item.quantity,
          price: price,
          status: "waiting",
          note: item.note,
        });
      }
      order.depositAmount = 0;
      order.totalAmount = totalDepositAmount / 0.3;
      order.resStatus = "seated";
      await order.save();
      for (let table of data.tables) {
        await db.Table.update(
          { orderId: order.id },
          {
            where: {
              id: table,
            },
          }
        );
      }
      return resolve({
        status: 201,
        message: "Create order successfully",
        data: order,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const updateOrder = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.orderId) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
        return;
      }
      let order = await db.Order.findOne({
        where: { id: data.orderId },
        raw: false,
      });

      if (!order) {
        resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
        return;
      }
      for (let key in data) {
        if (key !== "orderId") order[key] = data[key];
        await order.save();
      }
      resolve({
        status: 200,
        message: "Update order status success!",
        data: order,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getAllOrdersByCustomerPhoneNumber = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.customerPhoneNumber) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
      }
      let orders = await db.Order.findAll({
        where: { phoneNumber: data.customerPhoneNumber },
      });

      resolve({
        status: 200,
        message: "OK",
        data: orders,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const getAllOrdersByCustomerId = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.id) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
      }
      let orders = await db.Order.findAll({
        where: { cusId: data.id },
      });

      resolve({
        status: 200,
        message: "OK",
        data: orders,
      });
    } catch (e) {
      reject(e);
    }
  });
};

let getDetailOrderByOrderId = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.orderId) {
        return resolve({
          status: 400,
          message: "Missing required parameter!",
          data: "",
        });
      }
      let order = await db.Order.findOne({
        where: { id: data.orderId },
      });

      if (!order) {
        return resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
      }
      let dishes = [];
      // let bookedTables = await db.OrderTable.findAll({
      //   where: { orderId: data.orderId },
      // });
      // if (bookedTables.length > 0) {
      //   for (let i = 0; i < bookedTables.length; i++) {
      //     let table = await db.Table.findOne({
      //       where: { id: bookedTables[i].tableId },
      //     });
      //     tables.push(table);
      //   }
      // }
      let tables = await db.Table.findAll({
        where: { orderId: order.id },
        attributes: ["id", "name", "capacity", "position", "description"],
      });

      let orderItems = await db.OrderItem.findAll({
        where: { orderId: data.orderId },
      });
      if (orderItems.length > 0) {
        for (let i = 0; i < orderItems.length; i++) {
          let dish = await db.Dish.findOne({
            where: { id: orderItems[i].dishId },
          });
          dishes.push({
            id: orderItems[i].id,
            dishId: dish.id,
            dishName: dish.name,
            image: dish.image,
            price: orderItems[i].price,
            quantity: orderItems[i].quantity,
          });
        }
      }
      // let user = await db.User.findOne({
      //   where: { phoneNumber: order.phoneNumber.toString() },
      //   attributes: ["fullName", "email", "phoneNumber"],
      // });
      // if (!user) {
      //   user = "Guest"
      // }
      return resolve({
        status: 200,
        message: "Get detail order successfully",
        data: [
          {
            order: order,
            tables: tables,
            orderItems: dishes,
            // user: user,
          },
        ],
      });
    } catch (e) {
      reject(e);
    }
  });
};

const updateOrderItem = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.items || !data.orderId) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
      }
      let order = await db.Order.findOne({
        where: { id: data.orderId },
      });

      if (!order) {
        resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
      }
      for (let item of data.items) {
        if (item.action === "add") {
          await db.OrderItem.create({
            orderId: data.orderId,
            dishId: item.dishId,
            quantity: item.quantity,
            price: item.price,
          });
          continue;
        }
        if (item.action === "delete") {
          await db.OrderItem.destroy({
            where: {
              id: item.id,
            },
          });
          continue;
        }
        let orderItem = await db.OrderItem.findOne({
          where: {
            id: item.id,
          },
          raw: false,
        });
        if (!orderItem) {
          resolve({
            status: 404,
            message: "Order item is not exist",
            data: "",
          });
          return;
        }
        for (let key in item) {
          if (key !== "id") orderItem[key] = item[key];
        }
        await orderItem.save();
      }
      let dishes = [];

      let orderItems = await db.OrderItem.findAll({
        where: { orderId: data.orderId },
      });
      if (orderItems.length > 0) {
        for (let i = 0; i < orderItems.length; i++) {
          let dish = await db.Dish.findOne({
            where: { id: orderItems[i].dishId },
          });
          dishes.push({
            id: orderItems[i].id,
            dishId: dish.id,
            dishName: dish.name,
            price: orderItems[i].price,
            quantity: orderItems[i].quantity,
          });
        }
      }
      resolve({
        status: 200,
        message: "Update order item successfully",
        data: dishes,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const newUpdateOrder = (data) => {
  return new Promise(async (resolve, reject) => {
    console.log("🚀 ~ newUpdateOrder ~ data:", data);
    try {
      if (!data.orderId) {
        resolve({
          status: 400,
          message: "Missing required parameter",
          data: "",
        });
        return;
      }
      let order = await db.Order.findOne({
        where: { id: data.orderId },
        raw: false,
      });

      if (!order) {
        resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
        return;
      }
      if (order) {
        order.fullName = data.fullName;
        order.phoneNumber = data.phoneNumber;
        await order.save();
      }
      if (data.orderStatus) {
        let preStatus = order.resStatus;
        order.resStatus = data.orderStatus;
        await order.save();
        if (preStatus === "pending" && data.orderStatus === "confirmed") {
          await mailer.notifyOrderPlaceSuccess(order);
        }
        if (data.orderStatus === "canceled") {
          await mailer.notifyOrderCanceled(order);
        }
      }
      if (data.newOrderItems) {
        let totalAmount = 0;
        await db.OrderItem.destroy({
          where: {
            orderId: data.orderId,
          },
        });
        for (let item of data.newOrderItems) {
          totalAmount += item.total;
          await db.OrderItem.create({
            orderId: data.orderId,
            dishId: item.dishId,
            quantity: item.quantity,
            price: item.total,
          });
        }
        order.totalAmount = totalAmount;
        await order.save();
      }
      if (data.newTables) {
        await db.Table.update(
          { orderId: 0 },
          {
            where: {
              orderId: order.id,
            },
          }
        );
        for (let table of data.newTables) {
          await db.Table.update(
            { orderId: order.id },
            {
              where: {
                id: table.id,
              },
            }
          );
        }
      }
      resolve({
        status: 200,
        message: "Update order status success!",
        data: order,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const checkoutOrder = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !data.orderId ||
        !data.receivedMoney ||
        data.orderId === "" ||
        data.receivedMoney === ""
      )
        resolve({
          status: 400,
          message: "Missing required parameter",
        });
      let order = await db.Order.findOne({
        where: { id: data.orderId },
        raw: false,
      });
      if (!order) {
        resolve({
          status: 404,
          message: "Order is not exist",
          data: "",
        });
        return;
      }
      let subAmount = order.totalAmount - order.depositAmount;
      let change = data.receivedMoney - subAmount;
      return resolve({
        status: 200,
        message: "Checkout successful",
        data: {
          subAmount,
          change,
        },
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  getAllOrders,
  getAllOrdersByRestaurantId,
  updateStatusOrder,
  getAllOrdersByCustomerPhoneNumber,
  getDetailOrderByOrderId,
  updateOrder,
  updateOrderItem,
  newUpdateOrder,
  createOrderByStaff,
  getAllOrdersByCustomerId,
  checkoutOrder,
};
