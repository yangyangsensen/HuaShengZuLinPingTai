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
		          	creattime:new Date()
		          };
		          ShoppingModel.create(syl).then(function(rs){
			          console.log(rs);
			          //--------查询购物意向表---------------------
			          ShoppingModel.findAll({where:{uid:loginbean.id}}).then(function(shopList){
			          	//--------显示购物车---------------------------
			          	res.render('shoppingcar',{shopList:shopList});
			          });
			       }).catch(function(err){
			          console.log(err);
			          if(err.errors[0].path=='shoppinguniq')
					  {
						ShoppingModel.update({num:sequelize.literal('num+1')},{where:{'goodsid':goodsid,'uid':loginbean.id,'orderid':0}}).then(function(rs){
							//--------查询购物意向表---------------------
					          ShoppingModel.findAll({where:{uid:loginbean.id}}).then(function(shopList){
					          	//--------显示购物车---------------------------
					          	res.render('shoppingcar',{shopList:shopList});
					          });
							res.render('shoppingcar',{shopList:shopList});
						})
					  }else{
					  	res.send('数据库错误,请稍后再试');
					  }
			          // res.send('创建失败');
			       })
	
})

router.get('/buys', function(req, res, next) {
	
})

module.exports = router;