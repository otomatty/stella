public class CheckATotalDistanceTests
{
    [Fact(DisplayName = "確認A 隣の距離")]
    public void CheckATotalDistance()
    {
        Assert.Equal(8, Answers.CheckATotalDistance(new int[] { 4, 1, 6 }));
        Assert.Equal(0, Answers.CheckATotalDistance(new int[] { }));
        Assert.Equal(0, Answers.CheckATotalDistance(new int[] { 7 }));
        Assert.Equal(0, Answers.CheckATotalDistance(new int[] { 3, 3 }));
    }
}
