public class CheckCTripleDaysTests
{
    [Fact(DisplayName = "確認C 3倍の回数")]
    public void CheckCTripleDays()
    {
        Assert.Equal(3, Answers.CheckCTripleDays(2, 20));
        Assert.Equal(0, Answers.CheckCTripleDays(20, 20));
        Assert.Equal(1, Answers.CheckCTripleDays(1, 3));
        Assert.Equal(3, Answers.CheckCTripleDays(1, 10));
    }
}
