public class Q19SumGteKTests
{
    [Fact(DisplayName = "Q19 K以上の合計")]
    public void Q19SumGteK()
    {
        Assert.Equal(26, Answers.Q19SumGteK(new int[] { 3, 9, 4, 11, 6 }, 6));
        Assert.Equal(0, Answers.Q19SumGteK(new int[] { 1, 2, 3 }, 10));
        Assert.Equal(10, Answers.Q19SumGteK(new int[] { 5, 5 }, 5));
    }
}
