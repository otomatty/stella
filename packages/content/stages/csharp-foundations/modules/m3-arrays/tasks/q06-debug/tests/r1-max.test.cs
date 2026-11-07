public class R1MaxTests
{
    [Fact(DisplayName = "R1 配列の最大")]
    public void R1Max()
    {
        Assert.Equal(-1, Answers.R1Max(new int[] { -1 }));
        Assert.Equal(-2, Answers.R1Max(new int[] { -5, -2, -9 }));
        Assert.Equal(9, Answers.R1Max(new int[] { 3, 9, 4 }));
        Assert.Equal(0, Answers.R1Max(new int[] { 0 }));
    }
}
