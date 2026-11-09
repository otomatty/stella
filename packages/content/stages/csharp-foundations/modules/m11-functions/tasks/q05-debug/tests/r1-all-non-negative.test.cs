public class R1AllNonNegativeTests
{
    [Fact(DisplayName = "R1 負が無い")]
    public void R1AllNonNegative()
    {
        Assert.Equal(false, Answers.R1AllNonNegative(new int[] { -1 }));
        Assert.Equal(true, Answers.R1AllNonNegative(new int[] { }));
        Assert.Equal(true, Answers.R1AllNonNegative(new int[] { 0, 2 }));
        Assert.Equal(false, Answers.R1AllNonNegative(new int[] { 1, -2, 3 }));
    }
}
