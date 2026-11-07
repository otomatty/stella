public class S01SumGteKTests
{
    [Fact(DisplayName = "S01 検査の対象")]
    public void S01SumGteK()
    {
        Assert.Equal(13, Answers.S01SumGteK(new int[] { 2, 8, 5 }, 5));
        Assert.Equal(0, Answers.S01SumGteK(new int[] { }, 5));
        Assert.Equal(5, Answers.S01SumGteK(new int[] { 5 }, 5));
        Assert.Equal(0, Answers.S01SumGteK(new int[] { 1, 2 }, 5));
        Assert.Equal(12, Answers.S01SumGteK(new int[] { 4, 4, 4 }, 4));
    }
}
