var express = require('express');
var router = express.Router();
SphinxClient = require ("sphinxapi");
var sequelize =require('../models/ModelHeader')();
var GoodsModel = require('../models/GoodsModel');
var ShoppingModel = require('../models/ShoppingModel');

router.get('/goods', function(req, res, next) {
	console.log('访问goods');
	loginbean = req.session.loginbean;
   res.locals.loginbean = loginbean;
  keywords = req.query.keywords;
  kwArr = keywords.split(' ');
  len = kwArr.length;
  keyword = '';
  keyid='';
  for(i=0;i<len;i++){
  	if(kwArr[i]!=''){
  		keyword += kwArr[i]+'|';
  	}
  }
  var cl = new SphinxClient();
	cl.SetServer('localhost', 9312);
	cl.SetMatchMode(SphinxClient.SPH_MATCH_ANY);   //或运算
	cl.Query(keyword,'goods',function(err, result) {
	        if(err){
	        	console.log(err);
	        	console.log('-------有错-----------');
	        	res.send(err);
	        	return;
	        }
	        console.log(result);
	        for(var key in result['matches']){ 
						console.log(key+':===:'+result['matches'][key].id);
						keyid += ","+result['matches'][key].id;
					}
	                  keyid = keyid.replace(',','');
				  sql='select g.id,g.goodsname,g.price,g.praise,s.shopname,s.lng,s.lat from goods g,shops s where g.shopid=s.id and g.id in ('+keyid+')'
				  sequelize.query(sql).then(function(rs){		  
				  res.render('search/goods',{rs:rs[0]});
				  })
	       
	} );
	  
  
});
router.get('/cars', function(req, res, next) {
	loginbean = req.session.loginbean;
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}
		  //res.locals.loginbean = loginbean;
		  //--------查询goods表--------------------------
		  goodsid = req.query.goodsid;
		  
		  GoodsModel.findOne({where:{id:goodsid}}).then(function(goodsRs){
		          //--------插入购物意向表----------------------
		          syl = {
		          	goodsid:goodsid,
		          	uid:loginbean.id,
		          	price:goodsRs.price,
		          	num:1,
		          	shopid:goodsRs.shopid,
		          	createtime:new Date()
		          };
		          ShoppingModel.create(syl).then(function(rs){

			       }).catch(function(err){
			          console.log(err);
			          if(err.errors[0].path=='shoppinguniq')
					  {
						ShoppingModel.update({num:sequelize.literal('num+1')},{where:{'goodsid':goodsid,'uid':loginbean.id,'orderid':0}}).then(function(rs){
					       
						})
					  }else{
					  	res.send('数据库错误,请稍后再试');
					  }
			          // res.send('创建失败');
			       })
	
			})
		  })

router.get('/buys', function(req, res, next) {
    loginbean = req.session.loginbean;
	shoppingid=req.query.shoppingid;
	shoppingidArr=shoppingid.split(',');
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}
	ii=1;
	shopObj={};
	len = shoppingidArr.length;
	for(i=1;i<len;i++){
	sql='select shopid,price,num from shoppings where uid=? and id=? '
	let shoppingid = shoppingidArr[i];
	sequelize.query(sql,{replacements: [loginbean.id,shoppingid]}).then(function(rs){
		
		console.log(shoppingid)
		rsjson = JSON.parse(JSON.stringify(rs[0]));
		rs = rsjson[0];
		if(shopObj[rs.shopid]){
			tempObj=  shopObj[rs.shopid];
			tempObj.total += rs.price*rs.num;
			tempObj.shoppingid.push(shoppingid)
			shopObj[rs.shopid]=tempObj;
		}else{ 
			shopObj[rs.shopid]={};
			shopObj[rs.shopid].total= rs.price*rs.num;
			shopObj[rs.shopid].shoppingid=[shoppingid];
			
		}
		ii++;
		if(ii==len){
			ii=1;
			for(shopid in shopObj){
				sqlorder='insert into orders set total=?,uid=?,shopid=?';
				sequelize.query(sqlorder,{replacements: [shopObj[rs.shopid].total,loginbean.id,shopid],type: sequelize.QueryTypes.INSERT}).then(function(orderid){
					console.log(orderid);
					ids = shopObj[rs.shopid].shoppingid;
					
					shopObj[rs.shopid].idslen = ids.length;
					for(n=0;n<shopObj[rs.shopid].idslen;n++){
						
						sqlshop='update shoppings set orderid=? where id=?'
						sequelize.query(sqlshop,{replacements: [orderid,ids[n]],type: sequelize.QueryTypes.INSERT}).then(function(orderid){
					    ii++ 
					    if(ii==len){
						res.send('订单插入');
					}
					    })
					}
				});
			}
			
		}
 	 });
   }
	
})

router.get('/findcar', function(req, res, next) {
	loginbean = req.session.loginbean;
  sql = 'select s.id as shoppingid,g.id as goodsid,g.goodsimg,g.goodsname,s.price,s.num,g.shopid from  shoppings s,goods g where s.uid=? and s.orderid=0 and s.goodsid=g.id';
  	sequelize.query(sql,{replacements: [loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(shopList){
		  	//--------显示购物车---------------------------
		rsjson = JSON.parse(JSON.stringify(shopList[0]));
		res.render('search/findcar',{shopList:rsjson});
 	 });
	
})
router.get('/createorder', function(req, res, next) {
loginbean = req.session.loginbean;
	if(typeof(loginbean)=='undefined'){
		res.send('<script>alert("您没登陆,请登陆后操作");window.close();</script>');
		return;
	}

	orderStr = req.query.orderStr;
	orderArr = orderStr.split(',');
	len = orderArr.length;
	obj = {};
	ii=1;
	shoppingid=null;
	for(i=1;i<len;i++){
		v = orderArr[i];
		tempArr = v.split('_');
		shopid = tempArr[0];		//商店id
		goodsid = tempArr[1];		//商品id

		if(!obj[shopid]){
			obj[shopid]=[];
		}
		console.log(shopid);
		let a = shopid;
		sql = 'select shoppings.id as shoppingid,shoppings.goodsid,shoppings.price,shoppings.num,shops.id as shopid,shops.shopname,goods.id as goodsid,goods.goodsname from shoppings,goods,shops where shoppings.goodsid=? and shoppings.uid=? and shoppings.goodsid=goods.id and shoppings.shopid=shops.id and shoppings.orderid=0';
		sequelize.query(sql,{replacements: [goodsid,loginbean.id],type: sequelize.QueryTypes.QUERY}).then(function(gRs){

	      	rsjson = JSON.parse(JSON.stringify(gRs[0]));
	      	obj[a].push(rsjson[0]);
	      	obj[a].shopname=rsjson[0].shopname;
	      	ii++;
	      	shoppingid += ','+rsjson[0].shoppingid
	      	if(ii==len){
	      		// console.log(obj);
	      		// for(key in obj){
	      		// 	console.log('shopid='+key);
	      		// 	console.log(obj[key]);
	      		// }
	      		console.log(shoppingid)
	      		res.render('search/order',{rs:obj,shoppingid:shoppingid});
	      	}
	      	
	    });

	}
})
module.exports = router;