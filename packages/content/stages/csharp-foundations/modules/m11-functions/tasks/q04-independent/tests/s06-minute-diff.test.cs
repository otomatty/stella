public class S06MinuteDiffTests
{
    [Fact(DisplayName = "S06 時刻の差")]
    public void S06MinuteDiff()
    {
        Assert.Equal(20, Answers.S06MinuteDiff(9, 50, 10, 10));
        Assert.Equal(20, Answers.S06MinuteDiff(10, 10, 9, 50));
        Assert.Equal(0, Answers.S06MinuteDiff(0, 0, 0, 0));
        Assert.Equal(1439, Answers.S06MinuteDiff(23, 59, 0, 0));
    }
}
