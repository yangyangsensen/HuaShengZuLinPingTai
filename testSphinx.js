SphinxClient = require ("sphinxapi");
var cl = new SphinxClient();
cl.SetServer('localhost', 9312);
cl.Query('','goods',function(err, result) {
        if(err){
        	console.log(err);
        	console.log('-------�д�-----------');
        }
        console.log(result);
        for(var key in result['matches']){ //ѭ�������id
			console.log(key+':===:'+result['matches'][key].id);
		}
} );