const mq = require('ibmmq');
const MQC = mq.MQC
const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf8');

const qMgr = 'main_queue_manager'
const connectionName = 'main-queue-manager-3e90.qm.eu-gb.mq.appdomain.cloud(31609)'
const qName = 'DEV.valuation'
let ok = true

console.log("Setting up connection config")

const cno = new mq.MQCNO()
const sco = new mq.MQSCO()
const csp = new mq.MQCSP()

csp.UserId = 'profile'
csp.Password = '7vWwARQZhfiouMIgJaICA1HTCu7_TQykAGNgfeNw1-32'

cno.SecurityParms = csp
cno.Options |= MQC.MQCNO_CLIENT_BINDING

const cd = new mq.MQCD()

cd.ConnectionName = connectionName
cd.ChannelName = 'CLOUD.APP.SVRCONN'
cd.SSLCipherSpec = 'ANY_TLS12_OR_HIGHER'
cd.SSLClientAuth = MQC.MQSCA_OPTIONAL

cno.ClientConn = cd

sco.KeyRepository = './cert/key'
cno.SSLConfig = sco

mq.Connx(qMgr, cno, (err, conn) => {
	console.log("Starting connection")
	if (err) {
		console.log(err.message);
	} else {
		console.log(`MQCONN to ${qMgr} succesfull`)
		let od = new mq.MQOD();
		od.ObjectName = qName;
		od.ObjectType = MQC.MQOT_Q;
		let openOptions = MQC.MQOO_INPUT_AS_Q_DEF;
		mq.Open(conn, od, openOptions, function (err, hObj) {
			if (err) {
				console.log(formatErr(err));
			} else {
				console.log("MQOPEN of %s successful", qName);
				// And loop getting messages until done.
				getMessages(hObj);
			}
			//cleanup(conn,hObj);
		});
	}
})

function getMessages(hObj) {
/* 	while (ok) {
		getMessage(hObj);
	} */
	setInterval(() => {
		getMessage(hObj)
	}, 0)
}

// This function retrieves messages from the queue without waiting.
function getMessage(hObj) {

	let buf = Buffer.alloc(1024);
	let hdr;
	let mqmd = new mq.MQMD();
	let gmo = new mq.MQGMO();

	gmo.Options = MQC.MQGMO_NO_SYNCPOINT |
		MQC.MQGMO_NO_WAIT |
		MQC.MQGMO_CONVERT |
		MQC.MQGMO_FAIL_IF_QUIESCING;


	mq.GetSync(hObj, mqmd, gmo, buf, function (err, len) {
		//console.log("getting messages")
		if (err) {
			if (err.mqrc == MQC.MQRC_NO_MSG_AVAILABLE) {
				//console.log("no more messages");
			} else {
				console.log(formatErr(err));
			}
			//ok = false;
		} else {
			var format = mqmd.Format;
			switch (format) {
				case MQC.MQFMT_RF_HEADER_2:
					hdr = mq.MQRFH2.getHeader(buf);
					var props = mq.MQRFH2.getProperties(hdr, buf);
					console.log("RFH2 HDR is %j", hdr);
					console.log("Properties are '%s'", props);
					printBody(hdr.Format, buf.slice(hdr.StrucLength), len - hdr.StrucLength);
					break;
				case MQC.MQFMT_DEAD_LETTER_HEADER:
					hdr = mq.MQDLH.getHeader(buf);
					console.log("DLH HDR is %j", hdr);
					printBody(hdr.Format, buf.slice(hdr.StrucLength), len - hdr.StrucLength);
					break;
				default:
					printBody(format, buf, len);
					break;
			}
		}
	});
}

function printBody(format, buf, len) {
	if (format == "MQSTR") {
		console.log("*** New message ***")
		console.log(`message len=${len}`);
		console.log(decoder.write(buf.slice(0, len)))
		console.log("*******************")
	} else {
		console.log("binary message: " + buf);
	}
}