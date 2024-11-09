const express = require('express')
const { getActivityReport, cropAnalytics, bidAnalytics, cropTypeGraph, userTypeGraph, dashboardCounts, findAllUsers, findUserAdminTable, ToggleIsAdmin } = require('../database')
const redis = require('../redis')
const router = express.Router()

const requireLoginByAdmin = async (req, res, next) => {
    req.session.returnTo = '/admin';
    const catchData = await redis.get(`${req.session.user_id}`);
    if (!req.session || !req.session.user_id || !catchData) {
        req.flash('error', 'login first');
        return res.redirect('/login');
    }
    console.log(req.session.user);
    if(req.session.user.isAdmin!=1){
        req.flash('error', 'you are not an admin');
        return res.redirect('/product');
    }
    next();
}

const timeLog = (req, res, next) => {
  console.log('Time: ', Date.now())
  next()
}
router.use(timeLog);
router.use(requireLoginByAdmin);

router.get('/', (req, res) => {
    res.render("dashboard/init");
})
router.get('/api/report', async(req, res) => {
    const { startDate=Date.now(), endDate=Date.now()-(60*60*24*365) } = req.query;
    try {
        console.log(startDate,endDate);
        let report = await getActivityReport(startDate, endDate);
        report = { ...report, additionalData: 'someValue' };
        if (report) {
            res.status(200).json(report);
        } else {
            res.status(500).send('Error generating report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
})
router.get('/api/analytics',async(req,res)=>{
    const data=await cropAnalytics();
    res.status(200).json(data);
})

router.get('/api/bidAnalytics',async(req,res)=>{
    const {startDate, endDate}=req.query;
    console.log(startDate, endDate);
    const data=await bidAnalytics(startDate, endDate);
    console.log(data);
    res.status(200).json(data);
})
router.get('/api/cropTypeChart',async(req,res)=>{
    const data=await cropTypeGraph();
    res.status(200).json(data);
})
router.get('/api/userTypeChart',async(req,res)=>{
    const data=await userTypeGraph();
    console.log(data);
    res.status(200).json(data);
})
router.get('/api/dashboardData',async(req,res)=>{
    const visits=await redis.get('count');
    const data=await dashboardCounts();
    res.status(200).json({...data,visits});
})
router.post('/api/toggle-admin/:userId', async (req, res) => {
    const userId = req.params.userId;
    if(userId==req.session.userId){
        return res.status(500).json({ message: 'can not change self status' }); 
    }
    console.log('hit');
    try {
        const [user] = await findUserAdminTable(userId);
        console.log(user);
        if (user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const newIsAdminValue = !user.isAdmin;
        await ToggleIsAdmin(userId,newIsAdminValue);
        res.json({ success: true, isAdmin: newIsAdminValue });
    } catch (error) {
        console.error('Error toggling admin status:', error);
        res.status(500).json({ message: 'An error occurred while toggling admin status' });
    }
});
router.get('/report', async (req, res) => {
    try {
        res.render('dashboard/report');
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
});
router.get('/analytics',async(req, res) =>{
    try {

        res.render('dashboard/analytics');
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
})
router.get('/users',async(req, res) =>{
    const users = await findAllUsers();
    console.log(users);
    res.render('dashboard/users', { users });
})


module.exports = router;

